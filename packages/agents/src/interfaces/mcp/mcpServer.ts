import { MainWorkflow } from '../../workflows/mainWorkflow.js';
import { FileSystemImageStore } from '../../utils/imageStore.js';

export async function startMcpServer() {
  const imageStore = new FileSystemImageStore();
  const workflow = {
    run: () => MainWorkflow.run({ imageStore }),
  };

  // TODO: Implement MCP server wiring using workflow.run()
  return { workflow };
}
