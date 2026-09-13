import { readFile } from 'node:fs/promises';
// Test data comes from the migration seed; it is never shipped as a UI fallback.
const sql = await readFile(new URL('../supabase/migrations/202609130003_settings.sql', import.meta.url), 'utf8');
export const initialSettings = JSON.parse(sql.split('$config$')[1]);
export const initialProfile = { id: 1, image_path: 'assets/photos/lake.jpg', image_alt: '호수 풍경', image_width: 192, name: null, paragraphs: null, revision: 1 };
export async function mockSettings(page, payload = initialSettings) {
  await page.route('**/rest/v1/minihompy_profile*', route => route.fulfill({ json: [initialProfile] }));
  await page.route('**/rest/v1/minihompy_settings*', route => route.fulfill({
    json: [{ payload, revision: 1 }],
    headers: { 'access-control-allow-origin': '*' },
  }));
}
