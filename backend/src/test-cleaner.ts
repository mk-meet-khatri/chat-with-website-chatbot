import { cleanHtml } from './services/cleaner.service.js';

const mockHtml = `
<!DOCTYPE html>
<html>
  <head>
    <title>Mock Bookstore - A Light in the Attic</title>
  </head>
  <body>
    <header class="header-nav">
      <nav>
        <a href="/home">Home</a> | <a href="/about">About Us</a>
      </nav>
    </header>
    <main>
      <h1>A Light in the Attic</h1>
      <p class="price">£51.77</p>
      <div class="product-description">
        A Light in the Attic is a delightful collection of poetry and drawings by Shel Silverstein, first published in 1981. It covers many whimsical situations.
      </div>
    </main>
    <footer class="footer-bar">
      <p>&copy; 2026 Book Store Inc.</p>
    </footer>
  </body>
</html>
`;

console.log('Running standalone HTML cleaner test...');
const cleaned = cleanHtml(mockHtml);

console.log('--------------------------------------------------');
console.log('Extracted Title:', cleaned.title);
console.log('Extracted Text :', cleaned.cleanText);
console.log('--------------------------------------------------');

const titleOk = cleaned.title === 'Mock Bookstore - A Light in the Attic';
const textHasBookContent = cleaned.cleanText.includes('A Light in the Attic is a delightful collection');
const textStripsNavigation = !cleaned.cleanText.includes('About Us') && !cleaned.cleanText.includes('Book Store Inc.');

if (titleOk && textHasBookContent && textStripsNavigation) {
  console.log('✅ Success: Boilerplate was stripped and main content extracted correctly.');
  process.exit(0);
} else {
  console.error('❌ Failure: Extracted text contains boilerplate or missed target description.');
  process.exit(1);
}
