
import { resolvePdsEndpoint } from '../src/lib/social/bluesky';

// Mock SocialLogger to avoid import issues or unnecessary noise
// jest.mock('../src/lib/social/logger', () => ({
//     SocialLogger: {
//         info: console.log,
//         warn: console.warn,
//         error: console.error,
//     }
// }));

async function testResolution() {
    console.log('Testing PDS Resolution...');

    // Test 1: Known did:plc (Paul Frazee)
    const paulDid = 'did:plc:yk4dd2hvbo5wsfwx3r5ae5d'; // @pfrazee.com
    console.log(`\nResolving ${paulDid}...`);
    try {
        const pds1 = await resolvePdsEndpoint(paulDid);
        console.log(`Result: ${pds1}`);
    } catch (e) {
        console.error('Failed:', e);
    }

    // Test 2: Known did:web (Bluesky Team) - if applicable, or just another plc
    // jay.bsky.team -> did:web:jay.bsky.team
    const jayDid = 'did:web:jay.bsky.team';
    console.log(`\nResolving ${jayDid}...`);
    try {
        const pds2 = await resolvePdsEndpoint(jayDid);
        console.log(`Result: ${pds2}`);
    } catch (e) {
        console.error('Failed:', e);
    }
}

// polyfill fetch if needed (Node 18+ has it native)
if (!global.fetch) {
    console.warn('Fetch not defined globally');
}

testResolution();
