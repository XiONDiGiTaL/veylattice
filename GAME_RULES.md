# Provisional Game Rules

These are initial design targets and must be playtested. Update this file with every accepted ruling.

## Setup
Two players, 30-card decks, maximum 2 copies of each card ID. Each player starts at 30 Vitality and draws 5 cards. Board target is 7x7. Each player may control up to 4 Vessels and 2 Relics. A player loses at 0 or less Vitality.

## Turn proposal
At turn start, increase maximum Flux by 1 up to 10, then refill current Flux to maximum. Draw one card, except the first player skips their first normal draw. During the main phase, play cards, move eligible Vessels, and attack. Resolve end-of-turn effects and pass the turn. Flux starts with a maximum of 1; unspent Flux does not carry over. First/second choice and opening sequencing need testing.

## Cards
Vessel: creature occupying one square. Action: one-shot effect that normally goes to discard. Relic: persistent effect occupying a Relic slot.

## Movement and combat
Attack and Guard are integers 1-10. Orthogonal movement only by default; no diagonal movement. Units cannot pass through occupied squares unless an ability says otherwise. Movement/range use grid squares. One move and one attack per Vessel per turn is a provisional action-economy rule.

Combat proposal: validate attacker ownership, action availability, target legality, and range. Apply elemental modifiers. If effective Attack exceeds effective Guard, defender is defeated; otherwise it survives. Defender counterattacks and persistent damage are unresolved and must be decided before dependent effects are added.

Direct attack may be allowed when the opponent controls no Vessels. Initial proposal: half Attack rounded down, minimum 1 Vitality damage. Opening mulligan proposal: replace up to 2 opening cards once. In-match redraw is undecided. These are provisional, not finalized.
