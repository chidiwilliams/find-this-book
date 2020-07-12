const bookSources = document.getElementById('book-sources');
const bookName = document.getElementById('book-name');

const allSources = {
  AMAZON_US: 'amazon_us',
  AMAZON_UK: 'amazon_uk',
  GOODREADS: 'goodreads',
};

chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
  const { title, url } = tabs[0];

  const currentSrc = url.includes('amazon.com')
    ? allSources.AMAZON_US
    : allSources.AMAZON_UK;

  const book = parseBookDetails(title, url);
  if (!book) return;

  bookName.textContent = book.title;

  const sources = await getSources(book, currentSrc);

  sources.forEach((source) => {
    const li = document.createElement('li');

    const a = document.createElement('a');
    a.target = '_blank';
    a.href = source.url;
    a.textContent = source.message;

    li.appendChild(a);
    bookSources.appendChild(li);
  });
});

async function getSources(book, currentSrc) {
  const sources = [];
  const sss = Object.values(allSources);
  for (let index = 0; index < sss.length; index++) {
    const source = sss[index];
    const src = await getSource(book, currentSrc, source);
    if (src) sources.push(src);
  }
  return sources;
}

async function getSource(book, currentSrc, targetSrc) {
  if (targetSrc === currentSrc) {
    return;
  }

  if (targetSrc === allSources.AMAZON_US) {
    if (book.amazonID) {
      return {
        url: `https://www.amazon.com/gp/product/${book.amazonID}`,
        message: 'View on Amazon.com',
      };
    }
  }

  if (targetSrc === allSources.AMAZON_UK) {
    if (book.amazonID) {
      return {
        url: `https://www.amazon.co.uk/gp/product/${book.amazonID}`,
        message: 'View on Amazon.co.uk',
      };
    }
  }

  if (targetSrc === allSources.GOODREADS) {
    if (book.amazonID) {
      const goodreadsBook = await getGoodReadsBook(book.amazonID);
      if (goodreadsBook) {
        return {
          url: `https://www.goodreads.com${goodreadsBook.bookUrl}`,
          message: 'View on Goodreads',
        };
      }
    }

    if (book.isbn13) {
      const goodreadsBook = await getGoodReadsBook(book.isbn13);
      if (goodreadsBook) {
        return {
          url: `https://www.goodreads.com${goodreadsBook.bookUrl}`,
          message: 'View on Goodreads',
        };
      }
    }
  }
}

async function getGoodReadsBook(query) {
  const response = await fetch(
    `https://cors-anywhere.herokuapp.com/https://www.goodreads.com/book/auto_complete?format=json&q=${query}`,
    { method: 'GET', redirect: 'follow' },
  ).then((response) => response.json());
  return response[0];
}

function parseBookDetails(pageTitle, pageURL) {
  if (pageURL.includes('amazon')) {
    if (!pageTitle.includes('Books') && !pageTitle.includes('Kindle Store')) {
      return false;
    }

    const parsed = parseAmazonPageTitle(pageTitle);

    const amazonID = getAmazonIDFromURL(pageURL);
    return {
      amazonID,
      title: parsed.title,
      author: parsed.author,
      isbn13: parsed.isbn13,
    };
  }
  return false;
}

function getAmazonIDFromURL(url) {
  const match = url.match(/\b[0-9A-Za-z]{10}\b/);
  if (!match) return false;
  return match[0];
}

function parseAmazonPageTitle(pageTitle) {
  const splitTitle = pageTitle.split(':');
  const author = splitTitle[splitTitle.length - 4].trim();
  const title = splitTitle.slice(0, splitTitle.length - 4).join(':');
  let isbn13;
  {
    const pageISBN = splitTitle[splitTitle.length - 3].trim();
    if (isISBN13(pageISBN)) {
      isbn13 = pageISBN;
    }
  }
  return { title, author, isbn13 };
}

function isISBN13(str) {
  return str.length === 13 && str.startsWith('97');
}
