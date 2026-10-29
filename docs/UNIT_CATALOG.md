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


---

## Expansion 01 roster (CONTENT-001, generated from the card data)

The shipped pool is now **60 Vessels, 30 Actions and 12 Relics**. This table is generated from
`src/cards/expansion-set.json`; the manifest (`src/cards/manifest.json`) is the single list of sets the
app and tests load. Subtype coverage now includes knights, guardians, rogues, mages, priests,
artificers, archers, beasts, constructs, demons, dragons, ancients, spirits and otherworldly entities.

| Card id | Name | Element | Cost | ATK/GD | MV/RG | Keywords | Role |
|---|---|---|---|---|---|---|---|
| `vessel_emberwright_adept` | Emberwright Adept | fire | 2 | 3/4 | 1/2 | — | skirmishing spellblade |
| `vessel_cinder_warden` | Cinder Warden | fire | 4 | 5/6 | 1/1 | stalwart | holding the burning line |
| `vessel_slagborn_pyromancer` | Slagborn Pyromancer | fire | 3 | 3/5 | 1/2 | — | ranged caster |
| `vessel_glass_horn_charger` | Glass-Horn Charger | fire | 2 | 4/2 | 3/1 | swift | fast flanker |
| `vessel_ash_veil_assassin` | Ash-Veil Assassin | fire | 4 | 6/3 | 2/1 | — | single-target striker |
| `vessel_furnace_abbot` | Furnace Abbot | fire | 5 | 4/7 | 1/1 | deathrattleDraw | sustaining anchor |
| `vessel_obsidian_lancer` | Obsidian Lancer | fire | 5 | 7/5 | 2/2 | — | long-reach bruiser |
| `vessel_kiln_tyrant` | Kiln Tyrant | fire | 6 | 6/8 | 1/1 | stalwart | frontline wall |
| `vessel_pyre_sovereign` | Pyre Sovereign | fire | 8 | 9/7 | 2/2 | swift | late-game finisher |
| `vessel_tidecaller_acolyte` | Tidecaller Acolyte | water | 1 | 2/3 | 1/2 | — | cheap backline support |
| `vessel_reef_duelist` | Reef Duelist | water | 2 | 3/4 | 2/1 | — | mobile skirmisher |
| `vessel_saltglass_siren` | Saltglass Siren | water | 3 | 2/5 | 1/2 | deathrattleDraw | attrition caster |
| `vessel_brine_hound` | Brine Hound | water | 2 | 4/2 | 3/1 | swift | fast harasser |
| `vessel_abyssal_cartographer` | Abyssal Cartographer | water | 4 | 3/6 | 1/1 | — | durable utility |
| `vessel_riptide_monk` | Riptide Monk | water | 4 | 5/5 | 2/1 | — | balanced duelist |
| `vessel_leviathan_shard` | Leviathan Shard | water | 6 | 6/9 | 1/1 | stalwart | immovable anchor |
| `vessel_hollow_current` | The Hollow Current | water | 7 | 6/6 | 2/2 | deathrattleDraw | attrition finisher |
| `vessel_thornwood_sentinel` | Thornwood Sentinel | wood | 2 | 2/5 | 1/1 | stalwart | cheap blocker |
| `vessel_bramble_stalker` | Bramble Stalker | wood | 2 | 4/3 | 2/1 | — | aggressive beast |
| `vessel_mossback_warden` | Mossback Warden | wood | 4 | 3/8 | 1/1 | — | high-Guard wall |
| `vessel_whisperleaf_oracle` | Whisperleaf Oracle | wood | 3 | 2/4 | 1/2 | deathrattleDraw | value caster |
| `vessel_grove_harrier` | Grove Harrier | wood | 3 | 5/3 | 3/1 | — | fast flanker |
| `vessel_antlered_bulwark` | Antlered Bulwark | wood | 5 | 5/8 | 1/1 | stalwart | frontline beast |
| `vessel_willow_veil_priest` | Willow-Veil Priest | wood | 4 | 2/7 | 1/2 | — | sustaining support |
| `vessel_canopy_wyrm` | Canopy Wyrm | wood | 7 | 8/7 | 2/1 | — | aerial bruiser |
| `vessel_first_bloom` | The First Bloom | wood | 6 | 4/9 | 1/1 | deathrattleDraw | resilient anchor |
| `vessel_rubble_warden` | Rubble Warden | earth | 1 | 1/4 | 1/1 | stalwart | cheap blocker |
| `vessel_clayfist_brawler` | Clayfist Brawler | earth | 2 | 4/3 | 1/1 | — | cheap bruiser |
| `vessel_dust_sage` | Dust Sage | earth | 3 | 2/5 | 1/2 | — | ranged caster |
| `vessel_slatehorn_ram` | Slatehorn Ram | earth | 3 | 5/4 | 2/1 | — | charging beast |
| `vessel_quarry_engineer` | Quarry Engineer | earth | 4 | 3/6 | 1/2 | — | durable utility |
| `vessel_obsidian_mason` | Obsidian Mason | earth | 5 | 4/9 | 1/1 | stalwart | immovable blocker |
| `vessel_tomb_colossus` | Tomb Colossus | earth | 7 | 7/10 | 1/1 | — | late-game wall |
| `vessel_crown_of_dust` | Crown of Dust | earth | 6 | 5/8 | 1/2 | deathrattleDraw | attrition caster |
| `vessel_copper_squire` | Copper Squire | metal | 1 | 2/3 | 2/1 | — | cheap mobile unit |
| `vessel_lattice_artificer` | Lattice Artificer | metal | 3 | 3/4 | 1/2 | — | ranged support |
| `vessel_razorline_duelist` | Razorline Duelist | metal | 3 | 5/3 | 2/1 | swift | fast striker |
| `vessel_null_choir_cantor` | Null-Choir Cantor | metal | 4 | 2/6 | 1/2 | deathrattleDraw | value support |
| `vessel_ironstep_sentinel` | Ironstep Sentinel | metal | 4 | 3/8 | 1/1 | stalwart | frontline wall |
| `vessel_stormforge_lancer` | Stormforge Lancer | metal | 5 | 6/5 | 2/2 | — | reach bruiser |
| `vessel_clockwork_hydra` | Clockwork Hydra | metal | 7 | 7/8 | 2/1 | — | multi-headed bruiser |
| `vessel_quiet_engine` | The Quiet Engine | metal | 8 | 8/9 | 1/2 | stalwart | late-game anchor |
