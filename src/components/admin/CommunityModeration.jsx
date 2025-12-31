import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format, formatDistanceToNow, isToday } from 'date-fns';

const REACTION_EMOJIS = ['❤️', '👏', '🔥'];

export default function CommunityModeration() {
  const [posts, setPosts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, company_code, company_name')
        .order('company_code', { ascending: true });

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Fetch all community posts with user info
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
            full_name,
            company_id,
            companies (
              company_code,
              company_name
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (postsError) throw postsError;

      // Fetch reactions for all posts
      const postIds = postsData?.map(p => p.id) || [];
      let reactionsData = [];

      if (postIds.length > 0) {
        const { data: reactions, error: reactionsError } = await supabase
          .from('post_reactions')
          .select('post_id, emoji')
          .in('post_id', postIds);

        if (reactionsError) throw reactionsError;
        reactionsData = reactions || [];
      }

      // Combine posts with reaction counts
      const postsWithReactions = postsData?.map(post => {
        const postReactions = reactionsData.filter(r => r.post_id === post.id);
        const reactionCounts = {};

        REACTION_EMOJIS.forEach(emoji => {
          reactionCounts[emoji] = postReactions.filter(r => r.emoji === emoji).length;
        });

        return {
          ...post,
          reactionCounts,
        };
      }) || [];

      setPosts(postsWithReactions);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId) => {
    setDeleting(true);
    try {
      // Delete reactions first (though CASCADE should handle this)
      await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId);

      // Delete the post
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Refresh data
      await fetchData();
      setDeleteModal(null);
      alert('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  // Filter posts by company
  const filteredPosts = posts.filter((post) => {
    if (selectedCompanyId && post.users?.company_id !== selectedCompanyId) {
      return false;
    }
    return true;
  });

  // Calculate stats
  const totalPosts = filteredPosts.length;
  const postsToday = filteredPosts.filter(post =>
    isToday(new Date(post.created_at))
  ).length;

  // Find most active user
  const userPostCounts = {};
  filteredPosts.forEach(post => {
    const username = post.users?.username || post.users?.full_name || 'Unknown';
    userPostCounts[username] = (userPostCounts[username] || 0) + 1;
  });
  const mostActiveUser = Object.entries(userPostCounts)
    .sort((a, b) => b[1] - a[1])[0];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Community Moderation</h2>
        <p className="text-sm text-gray-600 mt-1">
          Review and manage community posts
        </p>
      </div>

      {/* Company Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div>
          <label htmlFor="company-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Company Code
          </label>
          <select
            id="company-filter"
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.company_code} - {company.company_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Posts {selectedCompanyId && '(Filtered)'}</p>
          <p className="text-2xl font-bold text-gray-900">{totalPosts}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Posts Today</p>
          <p className="text-2xl font-bold text-green-600">{postsToday}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Most Active User</p>
          <p className="text-2xl font-bold text-indigo-600">
            {mostActiveUser ? `@${mostActiveUser[0]}` : '-'}
          </p>
          {mostActiveUser && (
            <p className="text-sm text-gray-500">{mostActiveUser[1]} posts</p>
          )}
        </div>
      </div>

      {/* Posts List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reactions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPosts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        @{post.users?.username || 'unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {post.users?.full_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {post.users?.companies?.company_code ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {post.users.companies.company_code}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {post.emoji_type ? (
                      <span className="text-2xl">{post.emoji_type}</span>
                    ) : (
                      <p className="text-sm text-gray-900 max-w-xs truncate">
                        {post.content}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(new Date(post.created_at), 'MMM d, yyyy')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2 text-sm">
                      {REACTION_EMOJIS.map(emoji => {
                        const count = post.reactionCounts[emoji] || 0;
                        if (count === 0) return null;
                        return (
                          <span key={emoji} className="inline-flex items-center">
                            {emoji} {count}
                          </span>
                        );
                      })}
                      {REACTION_EMOJIS.every(e => !post.reactionCounts[e]) && (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setDeleteModal(post)}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No posts found</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Delete Post
              </h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                Are you sure you want to delete this post by <strong>@{deleteModal.users?.username || 'unknown'}</strong>?
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                {deleteModal.emoji_type ? (
                  <span className="text-2xl">{deleteModal.emoji_type}</span>
                ) : (
                  <p className="text-sm text-gray-700">{deleteModal.content}</p>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center mb-4">
                This will also delete all reactions on this post. This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteModal(null)}
                  disabled={deleting}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deletePost(deleteModal.id)}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
