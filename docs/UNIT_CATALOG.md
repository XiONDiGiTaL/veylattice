# Baseline Vessel Roster and Set Index

**Status:** Content design seed. Stats, names, relationships, costs, and abilities are prototypes for testing, not final competitive balance.

## Subtype coverage target
The first baseline catalog has two official Vessels for each subtype:
- Warrior: Ashen Crownblade; Argent Nightlancer
- Beast: Mireglass Stalker; Dustveil Matriarch
- Mystic: Hollowroot Oracle; Tidemark Astrologer
- Construct: Bastion of the First Mountain; Ironwrought Hound
- Demon: Cinder-Maw; Gilt-Ash Bargainer
- Dragon: Wyrm of the Drowned Vault; Cloudbreak Coil
- Ancient: Verdant Colossus; Rootbound Witness
- Spirit: Lantern of the Lost Choir; Bell of the Unmoored
- Otherworldly: The Star-Eater; The Unwritten Guest

The machine-readable catalog lives in `src/cards/starter-set.json`. Treat that data as canonical for current prototype fields. Descriptions here are design intent; update the JSON and docs together when names or stats change.

## Starter set concepts
### Last Banner of the Ashen Legion
- **Ashen Crownblade** (Fire Warrior): frontline champion; 6 Attack / 4 Guard, cost 3.
- **Argent Nightlancer** (Metal Warrior): disciplined commander; 5 Attack / 4 Guard, cost 3.
- Bond proposal: while orthogonally adjacent, same controller, each gets +1 Attack and +1 Guard.

### Root and Revelation
- **Hollowroot Oracle** (Wood Mystic): defensive seer and battlefield observer; 2/5, cost 3.
- **Verdant Colossus** (Wood Ancient): living bulwark; 4/8, cost 6.
- Bond proposal: Oracle gains +1 Guard while adjacent to Colossus.

### The Drowned Covenant
- **Mireglass Stalker** (Water Beast): fast ambusher; 4/3, cost 2.
- **Wyrm of the Drowned Vault** (Water Dragon): expensive area threat; 7/5, cost 6.
- Bond proposal: Stalker gains +1 Attack while adjacent to Wyrm.

## General random-roster design goals
The baseline catalog should include multiple units for each element, with distinct silhouettes and tactical roles. Use the catalog JSON as the source of truth; don't create a separate manually maintained roster that silently diverges from the data. Future additions should keep subtype coverage balanced and avoid assigning every new unit a Lore Bond.

## Voxel model descriptions
- Warrior: readable weapon silhouette, distinct helmet/shoulder outline, compact idle and attack motions.
- Beast: low quadruped profile, strong head silhouette, clear locomotion.
- Mystic: staff, floating sigils, robe/branch silhouette, readable casting pose.
- Construct: geometric body, exposed joints, material contrast, weighty motion.
- Demon: asymmetry, horns or furnace-like features, sharp silhouette; avoid generic copy-paste spikes.
- Dragon: long body, wing/crest silhouette, readable turn and strike animation.
- Ancient: tree/stone mass with root or branch silhouette; slow, weighty animation.
- Spirit: floating lantern/mask/ribbon motif; strong glow shape without hiding board tile.
- Otherworldly: intentionally unfamiliar geometry, restrained distortion effects, readable footprint and hit state.

All models must remain original, modular, and legible from the game's isometric/top-down camera. Shared animation families are encouraged, but do not make subtype models interchangeable recolors.
