import { MainWorkflow } from '../../workflows/mainWorkflow.js';
import { FileSystemImageStore } from '../../utils/imageStore.js';

export async function startMcpServer() {
  const workflow = new MainWorkflow(new FileSystemImageStore());
  // TODO: Implement MCP server wiring using workflow.run()
  return { workflow };
}
