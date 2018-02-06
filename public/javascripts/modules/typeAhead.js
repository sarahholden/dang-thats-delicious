// axios is similar to fetch, but with other helpers built in
import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHTML(stores) {
  return stores.map((store) => {
    return `
      <a class="search__result" href="/store/${store.slug}">
        <strong>${store.name}</strong>
      </a>
    `;
  }).join('');
}

function typeAhead(search) {
  if (!search) return;

  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');

  console.log(searchInput, searchResults);

  // Add event listener to searchInput using bling.js on method (instead of jQuery)
  searchInput.on('input', function () {
    // If there is no value, quit it!
    if (!this.value) {
      searchResults.style.display = 'none';
      return; // stop!
    }

    // Show the search results!
    searchResults.style.display = 'block';

    // Use axios to get search results
    axios
      .get(`/api/search?q=${this.value}`)
      .then((res) => {
        if (res.data.length) {
          searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
        } else {
          searchResults.innerHTML = dompurify.sanitize(`<div class="search__result"> No results for ${this.value} found!</div>`);
        }
      });
  });

  // handle keyboard inputs (arrow keys)
  searchInput.on('keyup', (e) => {
    // if they aren't pressing up, down or enter, who cares!
    if (![38, 40, 13].includes(e.keyCode)) {
      return;
    }
    const activeClass = 'search__result--active';
    const current = search.querySelector(`.${activeClass}`);
    const items = search.querySelectorAll('.search__result');
    let next;
    if (e.keyCode === 40 && current) {
      next = current.nextElementSibling || items[0];
    } else if (e.keyCode === 40) {
      next = items[0];
    } else if (e.keyCode === 38 && current) {
      next = current.previousElementSibling || items[items.length - 1];
    } else if (e.keyCode === 38) {
      next = items[items.length - 1];
    } else if (e.keyCode === 13 && current.href) {
      window.location = current.href;
      return;
    }

    if (current) {
      current.classList.remove(activeClass);
    }
    next.classList.add(activeClass);
  });
}

// Imported in delicious-app.js
export default typeAhead;
