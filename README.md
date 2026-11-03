# Stepwise – Algorithm Visualizer

A small, dependency-free website that animates sorting and pathfinding algorithms step by step.

**Sorting:** bubble, selection, insertion, merge, quick, heap
**Pathfinding:** A*, Dijkstra, breadth-first, depth-first (with walls and weighted cells)

## Run it locally

Open `index.html` in any browser. There is no build step.

To serve it over HTTP instead:

```
python3 -m http.server 8000
```

then visit http://localhost:8000.

## Put it online

It is a static site, so any static host works. Upload the whole folder (or the zip contents) to one of these:

- **Netlify:** go to app.netlify.com/drop and drag the folder onto the page.
- **GitHub Pages:** push the files to a repository, then Settings → Pages → deploy from the `main` branch, root folder.
- **Vercel / Cloudflare Pages:** import the repository or upload the folder; no build command, output directory is the root.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `style.css` | All styling and colors (edit the variables at the top of the file to re-theme) |
| `sorting.js` | Sorting algorithms, written as generators that yield one step at a time |
| `pathfinding.js` | Pathfinding algorithms, same approach |
| `explain.js` | Plain-English "what happened and why" text for every step |
| `app.js` | Animation loop, controls and drawing on the grid |

## Adding an algorithm

Add a generator to `sorting.js` or `pathfinding.js`, then register it in that file's `algorithms` object with a `name`, `tag`, `blurb`, `facts` and `run`. It appears in the sidebar and on the Home page automatically. Add matching explanation text in `explain.js` so each step says why it happens.

## Screenshots

### Homepage
![Homepage](Screenshot%202026-11-03%20072458.png)

### Sorting Visualization
![Sorting](Screenshot%202026-11-03%20072425.png)

### Pathfinding
![Pathfinding](Screenshot%202026-11-03%20072324.png)

### Pathfinding Result
![Pathfinding Result](Screenshot%202026-11-03%20072547.png)

### Additional View
![Additional View](Screenshot%202026-11-03%20072617.png)
