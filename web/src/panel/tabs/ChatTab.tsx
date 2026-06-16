import { useLocation } from "react-router-dom";

import { activityForPath } from "../../layout/activities";
import { chatConfigForActivity } from "../chat/chatConfigs";
import { ChatView } from "../chat/ChatView";

/**
 * The all-in-one chat. It picks its behaviour from the active activity, and is
 * keyed by activity id so switching activities starts a fresh conversation.
 */
export function ChatTab() {
  const { pathname } = useLocation();
  const activity = activityForPath(pathname);
  const config = chatConfigForActivity(activity.id);

  return <ChatView key={activity.id} config={config} />;
}
