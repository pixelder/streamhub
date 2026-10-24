// A TMDB page contains up to 20 raw titles. Local preferences can remove some,
// so keep the upstream cursor separate from the number of visible rows.
export async function catalogBatch(fetchPage, firstPage, { signal, minimum = 20, maxPages = 5 } = {}) {
  const items = new Map();
  let response;
  let filtered = false;
  let page = firstPage;
  for (let count = 0; count < maxPages; count++, page++) {
    signal?.throwIfAborted();
    try {
      response = await fetchPage(page, signal);
    } catch (error) {
      // Preserve completed pages if a later request fails. Retrying must begin
      // at the failed page, rather than dropping already available titles.
      if (!response || signal?.aborted) throw error;
      return { ...response, page: page - 1, results: [...items.values()], filtered, batchError: error };
    }
    filtered ||= !!response.filtered;
    for (const item of response.results || []) items.set(`${item.media_type}-${item.id}`, item);
    if (items.size >= minimum || page >= (response.total_pages ?? page)) break;
  }
  return { ...response, page: Math.min(page, firstPage + maxPages - 1), results: [...items.values()], filtered };
}
