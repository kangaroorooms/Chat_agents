import { toolRegistry } from './tool.registry'
import { SearchKnowledgeTool } from './searchKnowledge.tool'
import { SummarizeConversationTool } from './summarizeConversation.tool'
import { AssignConversationTool } from './assignConversation.tool'
import { TransferConversationTool } from './transferConversation.tool'
import { LookupCustomerTool } from './lookupCustomer.tool'

// Register tools
toolRegistry.register(SearchKnowledgeTool)
toolRegistry.register(SummarizeConversationTool)
toolRegistry.register(AssignConversationTool)
toolRegistry.register(TransferConversationTool)
toolRegistry.register(LookupCustomerTool)

export { toolRegistry }
