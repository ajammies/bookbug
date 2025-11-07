import { MainWorkflow } from '../../workflows/mainWorkflow.js';
import { FileSystemImageStore } from '../../utils/imageStore.js';
export async function createApiServer() {
    const workflow = new MainWorkflow(new FileSystemImageStore());
    // TODO: Wire up HTTP routes to call workflow.run()
    return { workflow };
}
//# sourceMappingURL=apiServer.js.map