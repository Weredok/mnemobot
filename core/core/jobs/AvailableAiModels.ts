import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_FILE_PATH = path.resolve(__dirname, 'ai-models.json');
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/models';

export class ModelUpdaterWorker {
  
   async updateModels() {
    try {
      console.log('[ModelUpdater] Syncing models...');

      const response = await fetch(OPENROUTER_API_URL);
      if (!response.ok) throw new Error(`[ModelUpdater] Failed to fetch models: ${response.status}`);
      
      const data = await response.json();
      const fetchedModels: any[] = data.data;

      let existingModels: any[] = [];
      try {
        const fileContent = await fs.readFile(MODELS_FILE_PATH, 'utf-8');
        existingModels = JSON.parse(fileContent);
      } catch (e) {
        console.log('[ModelUpdater] Failed to read existing models.');
      }

      const protectedModels = new Map<string, any>();
      for (const model of existingModels) {
        if (model.savedFromDeveloper) {
          protectedModels.set(model.id, model);
        }
      }

      const newModelsList = fetchedModels.map((m: any) => {
        if (protectedModels.has(m.id)) {
          return protectedModels.get(m.id);
        }

        const pricePrompt = parseFloat(m.pricing?.prompt || '0');
        const priceCompletion = parseFloat(m.pricing?.completion || '0');
        const isFree = pricePrompt === 0 && priceCompletion === 0;

        const provider = m.id.includes('/') ? m.id.split('/')[0] : 'unknown';

        return {
          id: m.id,
          name: m.name,
          provider: provider,
          context_length: m.context_length,
          pricing: {
            prompt: pricePrompt,
            completion: priceCompletion
          },
          isFree: isFree,
          savedFromDeveloper: false
        };
      });

      for (const [id, model] of protectedModels.entries()) {
        if (!newModelsList.find((m: any) => m.id === id)) {
          newModelsList.push(model);
        }
      }

      await fs.writeFile(MODELS_FILE_PATH, JSON.stringify(newModelsList, null, 2), 'utf-8');
      
      console.log(`[ModelUpdater] Updated ${newModelsList.length} models. Free models: ${newModelsList.filter((m: any) => m.isFree).length}`);

    } catch (error) {
      console.error('[ModelUpdater] Error:', error);
    }
  }

};

const worker = new ModelUpdaterWorker();
await worker.updateModels();