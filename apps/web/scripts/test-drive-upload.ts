
import { uploadToDrive } from '../src/lib/google-drive';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load .env
config({ path: resolve(process.cwd(), '.env') });

async function test() {
  console.log('Testing Google Drive Upload...');
  const dummyBuffer = Buffer.from('Hello Google Drive from IPE-24');
  try {
    const result = await uploadToDrive(dummyBuffer, 'test-upload.txt', 'text/plain');
    console.log('Success!', result);
  } catch (err: any) {
    console.error('Upload Failed!');
    if (err.response) {
      console.error('Response data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error:', err.message || err);
    }
  }
}

test();
