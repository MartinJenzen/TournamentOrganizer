**TODO**
-
- Standardize color themes
- More error handling
- Clean up CSS (especially containers, Table.css and TournamentPage.css)
- Transition to Tailwind CSS or SCSS
- More error response messages to users
- Add loading indicators while fetching data
- Unit tests
- More separation of concerns in \routes\tournaments.ts
- Make UI design more sexier (e.g., see TournamentPage.css for experiement and for inspiration: https://www.premierleague.com/en)
  - Use consistent spacing and alignment
  - Improve color contrast and readability
  - Enhance button styles and interactions
- Optimize database queries to reduce latency (select only necessary fields)
- Ensure returned status codes are correct (400 vs. 500)
- Transition to Prisma 7 (settings.json)
- If an existing match report is edited (after having been played), the result of this change should be reflected in which team either advances from either a group or knockout tie 
- Fix bug where the next knockout (maybe also regular) match is created within the previous match day, that was already played (related to editing existing match reports multiple times)
- Show cup playoff tree/brackets on OrganizeTeamsPage
- Enable undoing of a match report subsmission (in case of mistakes)
- Replace 'any' types with proper types wherever possible
- In top players list for goals/assists: if two players with the same name exist, show their team as well (CHE, LIV, etc.).
- Auto login if registrated

BUGS:
- Fix bug that causes the side panel to be scrollable
- (periodic): fix issue where the wrong team of two, with exact same stats (W, D, L, etc.), in same group, advances to knockout stage (e.g., 3rd place team advances instead of 2nd place team). Maybe something to do with how frontend arranges teams with same points vs. how backend does it. Can happen if all group match reports are reported as draws like 0-0.
  - Also, sometimes instead of creating the first knockout mathches on the next match day, they are created on match day 2 or 3.
- For an unknown reason several hundred tournaments were suddenly created.