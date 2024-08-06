const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const urls = require('./urls');  // Import URLs from urls.js

// Function to scrape data from a single website
async function scrapeWebsite(url) {
    try {
        console.log(`Scraping data from ${url}`);
        // Fetching the webpage
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // Extracting pageTitle from <h1>
        const pageTitle = $('h1').first().text().trim();

        // Removing "https://fmhy.net" from pagePath
        const pagePath = url.replace('https://fmhy.net', '');

        // Extracting sections
        const sections = [];
        let linkId = 0;

        $('.vp-doc h2, .vp-doc h3').each((i, title) => {
            const sectionTitle = $(title).text().trim();
            const links = [];

            // Find the next ul under the title
            $(title).nextUntil('h2, h3', 'ul').each((j, ul) => {
                $(ul).find('li').each((k, li) => {
                    const aTag = $(li).find('a');
                    if (aTag.length) {
                        // Extract and trim description text after 3 words
                        const desc = aTag.text().trim().split(' ').slice(0, 3).join(' ');
                        const href = aTag.attr('href');
                        const isstar = $(li).hasClass('starred');
                        // Trim the text before the "-" character for the sub field
                        const sub = $(li).text().split('-').pop().trim();

                        links.push({
                            id: linkId.toString(),
                            desc: desc,
                            href: href,
                            sub: sub,
                            isstar: isstar
                        });
                        linkId++;
                    }
                });
            });

            if (links.length > 0) {
                sections.push({
                    title: sectionTitle,
                    links: links
                });
            }
        });

        // Building the data for the current page
        const scrapedData = {
            pageTitle: pageTitle,
            pagePath: pagePath,
            sections: sections
        };

        return scrapedData;
    } catch (error) {
        console.error(`Failed to scrape data from ${url}: ${error.message}`);
        return null;
    }
}

// Function to save data to a JavaScript file
function saveToJsFile(data, filename = 'data.js') {
    const fileContent = `const Data = ${JSON.stringify(data, null, 4)};\n\nexport default Data;`;
    fs.writeFileSync(filename, fileContent, 'utf-8');
    console.log(`Data has been saved to ${filename}`);
}

// Function to copy data.js to a specific folder
function copyFileToFolder(filename, destinationFolder) {
    const destinationPath = path.join(destinationFolder, filename);
    fs.copyFileSync(filename, destinationPath);
    console.log(`File has been copied to ${destinationPath}`);
}

// Function to scrape data from multiple websites
async function scrapeMultipleWebsites(urls, destinationFolder) {
    const allData = [];

    for (const url of urls) {
        try {
            const scrapedData = await scrapeWebsite(url);
            if (scrapedData) {
                allData.push(scrapedData);
            }
        } catch (error) {
            console.error(`Failed to scrape data from ${url}: ${error.message}`);
        }
    }

    const filename = 'data.js';
    saveToJsFile(allData, filename);
    copyFileToFolder(filename, destinationFolder);
}

// Start the scraping process
const destinationFolder = path.resolve(__dirname, '../web-app'); // Specify the destination folder path here
scrapeMultipleWebsites(urls, destinationFolder);
