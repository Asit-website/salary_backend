const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generateDoc(sourceMdPath, outputBasename, title) {
    const { marked } = await import('marked');
    console.log(`Generating ${outputBasename}...`);
    
    if (!fs.existsSync(sourceMdPath)) {
        console.error(`Source file not found: ${sourceMdPath}`);
        return;
    }

    const mdContent = fs.readFileSync(sourceMdPath, 'utf8');
    const htmlBody = marked.parse(mdContent);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        <style>
            body {
                font-family: 'Segoe UI', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 900px;
                margin: 0 auto;
                padding: 40px;
            }
            h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; text-align: center; }
            h2 { color: #2980b9; margin-top: 30px; border-left: 5px solid #3498db; padding-left: 15px; }
            h3 { color: #16a085; }
            pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
            code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; }
            .note { background-color: #e7f3fe; border-left: 6px solid #2196F3; padding: 10px 20px; margin: 15px 0; }
            blockquote { background: #f9f9f9; border-left: 10px solid #ccc; margin: 1.5em 10px; padding: 0.5em 10px; }
            @media print { .page-break { page-break-before: always; } }
            /* Mermaid styling */
            .mermaid { display: flex; justify-content: center; margin: 20px 0; }
        </style>
    </head>
    <body>
        ${htmlBody}
        <script>
            mermaid.initialize({ startOnLoad: true, theme: 'default' });
            // Look for pre code blocks with mermaid language and convert them
            document.querySelectorAll('pre code.language-mermaid').forEach(el => {
                const graphDef = el.textContent;
                const parent = el.parentElement;
                const div = document.createElement('div');
                div.className = 'mermaid';
                div.textContent = graphDef;
                parent.replaceWith(div);
            });
        </script>
    </body>
    </html>
    `;

    // Save HTML for DOC export (simple conversion)
    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const docPath = path.join(exportDir, `${outputBasename}.doc`);
    fs.writeFileSync(docPath, fullHtml);

    // Set page content and wait for Mermaid to render
    await page.setContent(fullHtml);
    
    // Increased wait for mermaid rendering
    await new Promise(r => setTimeout(r, 2000));

    const pdfPath = path.join(exportDir, `${outputBasename}.pdf`);
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' }
    });

    console.log(`Finished ${outputBasename}`);
    await browser.close();
}

async function run() {
    const baseDir = 'C:/Users/chira/.gemini/antigravity/brain/4e0bcd95-ea95-493f-a6a9-a176cb6c147c';
    
    // 1. Technical Documentation
    await generateDoc(
        path.join(baseDir, 'payroll_system_documentation.md'),
        'Payroll_System_Documentation',
        'Technical Documentation - Payroll System'
    );

    // 2. User Manual
    await generateDoc(
        path.join(baseDir, 'payroll_user_manual.md'),
        'Payroll_User_Manual',
        'User Manual - Payroll System'
    );
}

run().catch(err => {
    console.error('Export failed:', err);
    process.exit(1);
});
