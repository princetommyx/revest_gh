# Service tile art

Drop the 3D renders for the Home service tiles in this folder.

## Spec

| | |
|---|---|
| Format | PNG with transparent background (not JPG — the tile tint must show through) |
| Size | 1024 × 1024 for the tall tile, 1024 × 512 for the two short tiles |
| Density | Ship `@2x` and `@3x` variants beside the base file; Metro picks them up automatically |
| Weight | Aim under ~150 KB each after compression — these load on Ghanaian mobile data |
| Framing | Subject bleeds slightly past the edge, as Yango does. Leave no baked-in background or shadow plate |
| Lighting | One consistent key light across all three, or they won't read as a set |

## Naming

```
clear-waste.png      tall tile  — Track A, the pay-to-clear pickup
sell-recyclables.png short tile — Track B, selling materials
my-listings.png      short tile
find-waste.png       tall tile  — collector/recycler view
jobs-nearby.png      short tile
my-pickups.png       short tile
```

## Wiring one in

Until a file exists here, the tile falls back to a large icon on the tinted
card, which is why the screen looks deliberate rather than broken today.

To switch a tile over, add one `art` key in `src/components/ServiceTiles.js`:

```js
tall: {
    label: 'Clear my waste',
    meta: 'pickup in minutes',
    art: require('../../assets/services/clear-waste.png'),   // <- add this
    Icon: Truck,
    tint: '#F1F2F4',
    onPress: () => go('Pickups'),
},
```

`Icon` can stay as the fallback. No layout changes are needed — the tile
already sizes and clips the art.

## Note on sourcing

These are illustrations, not photography, so stock photo libraries are the
wrong source. Options that match the reference look: a 3D icon set
(IconScout 3D, Storyset), a generated set kept to one consistent prompt and
lighting, or a commissioned pack. Whatever the source, render all six from
the same camera angle and light direction or the row will look assembled
rather than designed.
