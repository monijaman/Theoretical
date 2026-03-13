const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pdfDir = path.join(__dirname, 'PDFS');
const outputDir = path.join(pdfDir, 'parsed');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Get all PDF files
const pdfFiles = fs.readdirSync(pdfDir).filter(file => file.endsWith('.pdf'));

console.log(`Found ${pdfFiles.length} PDF files. Starting to parse...\n`);

let processedCount = 0;
let errorCount = 0;

// Process each PDF
pdfFiles.forEach((file, index) => {
    const filePath = path.join(pdfDir, file);
    const fileName = path.parse(file).name;
    const outputFile = path.join(outputDir, `${fileName}.md`);
    const tempTextFile = path.join(outputDir, `${fileName}.txt`);

    try {
        // Use pdftotext to extract text from PDF
        execSync(`pdftotext "${filePath}" "${tempTextFile}"`);

        // Read the extracted text
        const text = fs.readFileSync(tempTextFile, 'utf-8');

        // Create markdown content
        const mdContent = `# ${fileName}

**Source:** ${file}

---

## Content

${text}

---

*Parsed from PDF on ${new Date().toISOString()}*
`;

        fs.writeFileSync(outputFile, mdContent);

        // Clean up temp text file
        if (fs.existsSync(tempTextFile)) {
            fs.unlinkSync(tempTextFile);
        }

        processedCount++;
        console.log(`[${processedCount}/${pdfFiles.length}] ✓ ${fileName}.md`);
    } catch (err) {
        errorCount++;
        console.error(`[${index + 1}/${pdfFiles.length}] ✗ Error parsing ${file}: ${err.message}`);
    }
});

console.log(`\n=== Summary ===`);
console.log(`Successfully processed: ${processedCount}/${pdfFiles.length}`);
if (errorCount > 0) {
    console.log(`Errors: ${errorCount}`);
}
console.log(`Output directory: ${outputDir}`);
