import { MainWorkflow } from '../../workflows/mainWorkflow.js';
import { FileSystemImageStore } from '../../utils/imageStore.js';

export async function createApiServer() {
  const imageStore = new FileSystemImageStore();
  const workflow = {
    run: () => MainWorkflow.run({ imageStore }),
  };

  // TODO: Wire up HTTP routes to call workflow.run()
  return { workflow };
}
