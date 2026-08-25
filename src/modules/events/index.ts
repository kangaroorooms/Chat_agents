import auditSubscriber from './subscribers/audit-subscriber'
import analyticsSubscriber from './subscribers/analytics-subscriber'
import notificationsSubscriber from './subscribers/notifications-subscriber'
import aiSubscriber from './subscribers/ai-subscriber'
import socketSubscriber from './subscribers/socket-subscriber'

export const initDomainEventSubscribers = () => {
  auditSubscriber.init()
  analyticsSubscriber.init()
  notificationsSubscriber.init()
  aiSubscriber.init()
  socketSubscriber.init()
}
