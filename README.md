# Meadow

A living 3D landscape by Fahim Omi. Change the season, weather and time of day, move the tree and camper, and send a gust through the grass.

**[Live demo](https://meadow.fahimomi.com/)** · **[Project gallery](https://portfolio.fahimomi.com/)** · **[Fahim Omi](https://fahimomi.com/)**

## Run locally

Requires Node.js 18 or newer. No dependency installation or build is needed.

```sh
node serve.cjs
```

Open http://127.0.0.1:4179. Serve over HTTP; do not open index.html directly.

## Features

- Interactive Three.js r128 landscape, camper and seated 3D character.
- Seasons, rain, snow, drifting clouds and sun occlusion.
- Day, golden hour, dusk and night illumination.
- Adaptive GPU workload; optional High, Ultra and Low modes.
- Scene, vehicle and character cameras; PNG export.
- Assets and runtime dependencies included locally. No analytics or API keys.

## Integrate

Load public/vendor/build/three.min.js, then public/meadow-hero.js, and mount into an element with a defined height:

```js
const scene = MeadowHero.mount(document.getElementById('hero'), {
  quality: 'auto', light: 'golden', season: 'summer',
  assetsPath: 'meadow-assets/', scriptsPath: 'vendor/examples/js/'
});
scene.setLight('night');
// scene.setWeather('rain'); scene.setSeason('winter'); scene.destroy();
```

The complete script list is in public/index.html. Deploy the public directory on any static host. wrangler.jsonc configures Cloudflare Workers static hosting; change the worker name and domain before deploying your own fork.

## License and attribution

Project code and original assets are MIT licensed. Third-party material retains its original license: Three.js and ez-tree assets are MIT; MakeHuman skin/anatomy and Poly Haven bark are CC0. See public/meadow-assets/CREDITS.txt, public/meadow-assets/LICENSE-ez-tree.txt and public/vendor/LICENSE. The replacement character is a derivative rebuild of the supplied MakeHuman-based anatomy, not a scan.

## Limits

This is real-time WebGL, not path tracing. Performance depends on GPU, viewport and weather. Adaptive is the default. The simple character rig and approximate skin shading limit close-up realism.

Only this Meadow project is open source. The linked portfolio and other projects have independent licensing and visibility.

## Rebuild the character

Run node tools/sculpt-character-v38.cjs to regenerate the replacement GLB from the included posed anatomy data. No additional packages are required.

