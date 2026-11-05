# Licences for the compact AIT campus (17 Oct 2026)
All CC0, MIT or our own. No GTA, Google or Street View files are shipped; Street View was a look reference only.
The project-wide table is assets/LICENSES.md.

| Asset | Source | Licence | Where |
|---|---|---|---|
| leafy_grass (diffuse 1k webp, normal 512) | https://polyhaven.com/a/leafy_grass | CC0 1.0 | game/look/assets/ph/textures/leafy_grass |
| dry_decay_leaves (diffuse 1k webp, normal 512) | https://polyhaven.com/a/dry_decay_leaves | CC0 1.0 | game/look/assets/ph/textures/dry_decay_leaves |
| withered_grass (diffuse 1k webp, normal 512) | https://polyhaven.com/a/withered_grass | CC0 1.0 | game/look/assets/ph/textures/withered_grass |
| farm_soil (diffuse 1k webp, normal 512) | https://polyhaven.com/a/farm_soil | CC0 1.0 | game/look/assets/ph/textures/farm_soil |
| white_render (512 webp): plastered_wall diffuse, desaturated and lifted to white | derived from https://polyhaven.com/a/plastered_wall | CC0 1.0 | game/look/assets/ph/textures/white_render |
| asphalt_02, concrete_pavement, grey_plaster, plastered_wall, brick wall set | Poly Haven, already in the world look | CC0 1.0 | game/look/assets/ph/textures |
| Street HDRI used for light and reflections | Poly Haven, already in the world look | CC0 1.0 | game/look/assets/ph |
| three.js r169 FontLoader.js, TextGeometry.js | https://github.com/mrdoob/three.js (unpkg three@0.169.0/examples/jsm) | MIT | game/look/vendor/addons/loaders, game/look/vendor/addons/geometries |
| helvetiker_bold.typeface.json (3D letters: gate wall, WELCOME, SV, Dorm Y, AITCC, SOM, SERD) | three.js r169 examples/fonts | MIT (as shipped with three.js) | game/look/vendor/addons/fonts |
| Campus layout, buildings, gate, flags, signs, trees, palms, hedges, bikes, cars, field plots | procedural, written for Sansar | ours | game/world/aitc.js |
| Dorm Y size and storey count | OpenStreetMap, via game/assets/ait/campus.json | ODbL 1.0 | game/world/aitc.js (dimensions only) |
| Player vehicles: road bicycle, commuter motorbike, small hatchback (wheels, bars, pedals, steering wheel and doors as separate parts; plates with made-up numbers, no brand marks) | procedural, written for Sansar | ours | game/world/vehicles.js |
| Vehicle sounds: engine by rpm, freewheel click, skid, wind, horn, bicycle bell, crash thud | synthesised in code with WebAudio, no sound files | ours | game/world/vehicles.js |
| Controls hint, phone riding pad, look settings | written for Sansar | ours | game/world/controls.js |

## Characters (18 Oct 2026)
| Asset | Source | Licence | Where |
|---|---|---|---|
| MakeHuman base mesh, body and face targets, low-poly proxies (female1605, male1591) | MakeHuman system assets via MPFB 2.0.18 in Blender 4.5 (the tool is GPL; its output is CC0) | CC0 1.0 | game/assets/characters/mh/out, game/assets/mh/core_*.bin, body_*.bin, lod_*.bin |
| MakeHuman skins (young/old light and dark, female and male): hue-evened and tinted at build | MakeHuman system assets | CC0 1.0 | game/assets/mh/skin_*.jpg |
| MakeHuman clothes (female_casualsuit01/02, female_elegantsuit01, female_sportsuit01, male_casualsuit01-06, male_elegantsuit01, male_worksuit01), shoes01-06; prints and stripes blurred at build | MakeHuman system assets | CC0 1.0 | game/assets/mh/cloth*.jpg and part .bin files |
| MakeHuman eyebrow001, eyebrow008, eyelashes01/02, high- and low-poly eyes with six irises | MakeHuman system assets | CC0 1.0 | game/assets/mh/brow_*, lash_*, eyes*.bin |
| Hair: layered strand cards, strand texture, hairline and scalp paint for 13 styles | procedural, written for Sansar (hair_cards.py) | ours | game/assets/mh/hc_*.bin, hair*.webp |
| Skeleton and clips (idle, walk, run, wave, sit) the bodies are bound to | Quaternius, see assets/LICENSES.md | CC0 1.0 | game/assets/av |
