import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const QUICK_EMOJIS = ['💪', '🎉', '❤️', '🔥', '👏', '⭐'];
const REACTION_EMOJIS = ['❤️', '👏', '🔥'];
const LOAD_TIMEOUT_MS = 5000;

export default function Community() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [postContent, setPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const channelRef = useRef(null);

  // Fetch a single post by ID (for real-time updates)
  const fetchSinglePost = useCallback(async (postId) => {
    if (!profile?.id) return null;

    try {
      const { data: post, error: postError } = await supabase
        .from('community_posts')
        .select(`
          id,
          content,
          emoji_type,
          created_at,
          user_id,
          users (
            id,
            username,
            full_name
          )
        `)
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // Fetch reactions for this post
      const { data: reactions, error: reactionsError } = await supabase
        .from('post_reactions')
        .select('id, post_id, user_id, emoji')
        .eq('post_id', postId);

      if (reactionsError) throw reactionsError;

      const reactionCounts = {};
      const userReactions = {};

      REACTION_EMOJIS.forEach(emoji => {
        reactionCounts[emoji] = (reactions || []).filter(r => r.emoji === emoji).length;
        userReactions[emoji] = (reactions || []).some(r => r.emoji === emoji && r.user_id === profile.id);
      });

      return {
        ...post,
        reactionCounts,
        userReactions,
      };
    } catch (error) {
      console.error('Error fetching single post:', error);
      return null;
    }
  }, [profile?.id]);

  // Fetch all posts
  const fetchPosts = useCallback(async () => {
    if (!profile?.company_id) return;

    setLoadError(null);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setLoadError('Loading took too long. Please try refreshing.');
    }, LOAD_TIMEOUT_MS);

    try {
      // Fetch posts with user info - limit to 20 for performance
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select(`
          id,
          content,
          emoji_type,
          created_at,
          user_id,
          users (
            id,
            username,
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      // Fetch reactions for all posts in one query
      const postIds = postsData?.map(p => p.id) || [];

      let reactionsData = [];
      if (postIds.length > 0) {
        const { data, error: reactionsError } = await supabase
          .from('post_reactions')
          .select('id, post_id, user_id, emoji')
          .in('post_id', postIds);

        if (reactionsError) throw reactionsError;
        reactionsData = data || [];
      }

      // Combine posts with their reactions
      const postsWithReactions = postsData?.map(post => {
        const postReactions = reactionsData.filter(r => r.post_id === post.id);
        const reactionCounts = {};
        const userReactions = {};

        REACTION_EMOJIS.forEach(emoji => {
          reactionCounts[emoji] = postReactions.filter(r => r.emoji === emoji).length;
          userReactions[emoji] = postReactions.some(r => r.emoji === emoji && r.user_id === profile.id);
        });

        return {
          ...post,
          reactionCounts,
          userReactions,
        };
      }) || [];

      clearTimeout(timeoutId);
      setPosts(postsWithReactions);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error fetching posts:', error);
      setLoadError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id, profile?.id]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!profile?.company_id) return;

    fetchPosts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('community-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_posts',
        },
        async (payload) => {
          // Fetch the new post with user data
          const newPost = await fetchSinglePost(payload.new.id);
          if (newPost) {
            setPosts(prev => [newPost, ...prev.slice(0, 19)]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_reactions',
        },
        (payload) => {
          const { post_id, user_id, emoji } = payload.new;
          setPosts(prev => prev.map(post => {
            if (post.id !== post_id) return post;
            return {
              ...post,
              reactionCounts: {
                ...post.reactionCounts,
                [emoji]: (post.reactionCounts[emoji] || 0) + 1,
              },
              userReactions: {
                ...post.userReactions,
                [emoji]: user_id === profile?.id ? true : post.userReactions[emoji],
              },
            };
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'post_reactions',
        },
        (payload) => {
          const { post_id, user_id, emoji } = payload.old;
          setPosts(prev => prev.map(post => {
            if (post.id !== post_id) return post;
            return {
              ...post,
              reactionCounts: {
                ...post.reactionCounts,
                [emoji]: Math.max(0, (post.reactionCounts[emoji] || 0) - 1),
              },
              userReactions: {
                ...post.userReactions,
                [emoji]: user_id === profile?.id ? false : post.userReactions[emoji],
              },
            };
          }));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [profile?.company_id, profile?.id, fetchPosts, fetchSinglePost]);

  const handleQuickEmoji = async (emoji) => {
    if (!profile?.id || posting) return;

    setPosting(true);
    try {
      const { error } = await supabase
        .from('community_posts')
        .insert([{
          user_id: profile.id,
          emoji_type: emoji,
          content: null,
        }]);

      if (error) throw error;
      // Real-time subscription will handle adding the post
    } catch (error) {
      console.error('Error posting emoji:', error);
    } finally {
      setPosting(false);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!profile?.id || !postContent.trim() || posting) return;

    setPosting(true);
    try {
      const { error } = await supabase
        .from('community_posts')
        .insert([{
          user_id: profile.id,
          content: postContent.trim(),
          emoji_type: null,
        }]);

      if (error) throw error;
      setPostContent('');
      // Real-time subscription will handle adding the post
    } catch (error) {
      console.error('Error posting:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleReaction = async (postId, emoji) => {
    if (!profile?.id) return;

    const post = posts.find(p => p.id === postId);
    const hasReacted = post?.userReactions[emoji];

    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        reactionCounts: {
          ...p.reactionCounts,
          [emoji]: hasReacted ? Math.max(0, p.reactionCounts[emoji] - 1) : p.reactionCounts[emoji] + 1,
        },
        userReactions: {
          ...p.userReactions,
          [emoji]: !hasReacted,
        },
      };
    }));

    try {
      if (hasReacted) {
        const { error } = await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', profile.id)
          .eq('emoji', emoji);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_reactions')
          .insert([{
            post_id: postId,
            user_id: profile.id,
            emoji,
          }]);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      // Revert optimistic update on error
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          reactionCounts: {
            ...p.reactionCounts,
            [emoji]: hasReacted ? p.reactionCounts[emoji] + 1 : Math.max(0, p.reactionCounts[emoji] - 1),
          },
          userReactions: {
            ...p.userReactions,
            [emoji]: hasReacted,
          },
        };
      }));
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-display font-bold text-white mb-4">Community</h2>
        <div className="flex justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-600 border-t-brand-teal"></div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-slate-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-display font-bold text-white mb-4">Community</h2>
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">{loadError}</p>
          <button
            onClick={() => {
              setLoading(true);
              setLoadError(null);
              fetchPosts();
            }}
            className="px-4 py-2 bg-brand-teal text-white rounded-lg hover:bg-opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display font-bold text-white">Community</h2>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/50">
          Live
        </span>
      </div>

      {/* Quick Emoji Buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {QUICK_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => handleQuickEmoji(emoji)}
            disabled={posting}
            className="text-2xl p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors duration-200 disabled:opacity-50"
            title={`Post ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Post Input */}
      <form onSubmit={handlePostSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="Share encouragement, tips, or updates..."
            className="flex-1 px-4 py-3 bg-slate-700 text-white placeholder-slate-400 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-brand-teal"
            maxLength={280}
          />
          <button
            type="submit"
            disabled={!postContent.trim() || posting}
            className="px-6 py-3 bg-brand-teal text-white font-semibold rounded-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {posting ? '...' : 'Send'}
          </button>
        </div>
      </form>

      {/* Posts Feed */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {posts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-slate-700 rounded-xl p-4">
              {/* Post Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">
                    {post.users?.username ? `@${post.users.username}` : post.users?.full_name || 'Anonymous'}
                  </span>
                  {post.user_id === profile?.id && (
                    <span className="text-xs text-brand-teal">(You)</span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>

              {/* Post Content */}
              <div className="mb-3">
                {post.emoji_type ? (
                  <span className="text-4xl">{post.emoji_type}</span>
                ) : (
                  <p className="text-slate-200">{post.content}</p>
                )}
              </div>

              {/* Reactions */}
              <div className="flex gap-2">
                {REACTION_EMOJIS.map(emoji => {
                  const count = post.reactionCounts[emoji] || 0;
                  const hasReacted = post.userReactions[emoji];

                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(post.id, emoji)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors duration-200 ${
                        hasReacted
                          ? 'bg-brand-teal/20 text-brand-teal border border-brand-teal'
                          : 'bg-slate-600 text-slate-300 hover:bg-slate-500 border border-transparent'
                      }`}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      {posts.length >= 20 && (
        <p className="text-xs text-slate-400 text-center mt-4">
          Showing last 20 posts
        </p>
      )}
    </div>
  );
}
