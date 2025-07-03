**System Definition**

A webapp. that allows users to create a European foorball tournament (league or group play with playoffs) and keep track of the results (team standings, scores and stats of both teams and players, etc.) of the matches in one or multiple tables. 

**Team and Player Stats**

Team stats incl. games played (GP), wins (W), losses (L), draws (D), goals for (GF), goals against (GA), goal difference (GD) and points (PTS).

Player stats incl. goals and assists.

**Match Report**

A match report consists of the number of goals scored by both teams and specified by which players scored these goals, incl. their assists.Filling a match report updates the scores in the tables and player stats. Match reports can be filled out manually by the users, or through the help of an AI service that analyzes photos of the match result and then fills out the match report automatically.

**User Interface**

On the webpage users can sign-up a profile with an email, password and an optional username. A signed-up user can create one or more separate tournaments, add teams (team names), and manage match reports, and even manually adjust team/player scores/stats in tables. Users can invite other users to co-manage or view-only their tournaments. Users not signed up can view tournaments incl. team scores, player stats and match reports.

**Actors**

Primary Actors:
- User: A person who creates and manages, or just views, a tournament.

Secondary Actors:
- AI Service: assists the users in filling out the match reports through provided photos.

**Example Scenario**
Alice creates a tournament for the e.g., the European Championship and adds teams like Germany, France, etc. and fills out match reports after each game (consisting of which teams scored how many goals, and which players scored/assisted how many goals). The app. calculates team standings and player stats automatically. Alice can invite Bob to help manage or only view the tournament.


Alice...
1. Selects ‘Cup’ as the tournament format.  
2. Selects ‘8’ for the number of teams participating.  
3. Selects ‘2’ for the number of groups.  
4. Selects ‘2’ for the number of top teams advancing from each group.  
5. Selects ‘2’ for the number of matches per team in the group stage.  
6. Selects ‘1’ for the number of legs in the knockout stage (final is always a single match).  
7. Enters the names of the participating teams (e.g. "Germany", "France", "Denmark", etc.).  
   - The app. knows the teams from a database and suggests matches as Alice types in.  
8. Chooses "Denmark" and "Italy" as the human-controlled teams (for Alice and Bob).  
9. Assigns teams to groups.  
   - Or she can press **Randomize** to let the app. assign teams (ensuring human-controlled teams don't end up together).  
10. Presses **Create Tournament** to finalize the setup.  
11. The system generates the group-stage match schedule and marks any match featuring a human-controlled team as **Pending**.
12. Alice invites Bob to co-manage the tournament.  
    - Bob receives a notification for this invitation on the webapp. which he can login to accept or decline.
13. Alice and Bob play a match and fill out the match report, specifying goals and assists per player.  
    - AI-controlled matches can be simulated automatically, or Alice can complete reports manually.
    - Reports can be filled out automatically by an AI service that analyzes photos of the match result.  
14. The app. updates team standings and player statistics in real-time.
15. Alice and Bob play all the group stage matches both qualify for the knockout stage.
16. The app. generates the knockout stage schedule based on group results, and ensures that 2nd place teams face 1st place teams from other groups.
17. Alice and Bob plays all the knockout matches (semi-finals and finals), filling out match reports as they go.
18. The app. updates the knockout standings and player stats after each match.
19. The tournament concludes with a final match, and the app. displays the winner and final standings and stats.

