// Debug the exact HTML comments from the screenshot
const testContent = `Now, I'll update the HomePage component to include the testimonials section:
<!-- XMLTOOL_pilotedit_1758628594595_554cakpx7 -->
Next, I'll create a blog section component:

Now, I'll update the HomePage component to include the blog section:
<!-- XMLTOOL_pilotedit_1758628594595_xdpa1fvck -->
Finally, I'll create a newsletter signup component:`;

// Test our current regex pattern
const regex = /<!-- XMLTOOL_(pilot\w+)_(\d+)_([a-z0-9]+) -->/gi;
const matches = [...testContent.matchAll(regex)];

console.log('Testing regex pattern:', regex.source);
console.log('Found matches:', matches.length);

matches.forEach((match, index) => {
  console.log(`${index + 1}. Full match: "${match[0]}"`);
  console.log(`   Tool type: "${match[1]}"`);
  console.log(`   Timestamp: "${match[2]}"`);
  console.log(`   Random ID: "${match[3]}"`);
});

// Check if the pattern matches the exact strings from screenshot
const testStrings = [
  '<!-- XMLTOOL_pilotedit_1758628594595_554cakpx7 -->',
  '<!-- XMLTOOL_pilotedit_1758628594595_xdpa1fvck -->'
];

console.log('\nTesting individual strings:');
testStrings.forEach((str, index) => {
  const match = str.match(regex);
  console.log(`${index + 1}. "${str}" -> ${match ? 'MATCHES' : 'NO MATCH'}`);
  if (match) {
    console.log(`   Captured groups:`, match.slice(1));
  }
});