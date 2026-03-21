export function sortConversations(items) {
  return [...items].sort((a, b) => {
    const aTime = a?.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b?.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function upsertConversation(list, conversation) {
  const byId = new Map(list.map((item) => [item.id, item]));
  byId.set(conversation.id, { ...(byId.get(conversation.id) || {}), ...conversation });
  return sortConversations([...byId.values()]);
}

export function mergeMessages(existing, incoming) {
  const list = Array.isArray(incoming) ? incoming : [incoming];
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of list) {
    byId.set(item.id, { ...(byId.get(item.id) || {}), ...item });
  }
  return [...byId.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function resolveErrorMessage(error, fallback = 'Something went wrong') {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}
