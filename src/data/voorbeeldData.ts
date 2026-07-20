// Voorbeeld CSV data voor testen
// Deze bestanden kunnen direct geïmporteerd worden

export const VOORBEELD_BEDDEN_CSV = `Sectie;Bed;Vakken;Lengte (m);Breedte (m);Grootte (m2);Zon/Schaduw;Opmerkingen;Plan voor bed
A;1;4;6;1,2;7,2;Zon;Goed gedraineerd;Sla en kolen
A;2;4;6;1,2;7,2;Zon;;Wortelen en bieten
A;3;3;5;1,2;6;Halfschaduw;Wat beschut;Kruiden
B;1;4;6;1,2;7,2;Zon;;Tomaten
B;2;4;6;1,2;7,2;Zon;;Paprika en pepers
B;3;4;6;1,2;7,2;Halfschaduw;;Courgette
C;1;6;8;1,2;9,6;Zon;Grote bed;Aardappelen
C;2;4;6;1,2;7,2;Zon;;Bonen
D;1;4;6;1,2;7,2;Schaduw;Onder boom;Bladgroenten
D;2;4;6;1,2;7,2;Halfschaduw;;Spinazie
E;1;4;6;1,2;7,2;Zon;;Pompoen
Kas;1;2;4;1;4;Zon;In kas;Vooropkweek
Kas;2;2;4;1;4;Zon;In kas;Tomaten kas`;

export const VOORBEELD_GEWASSEN_CSV = `Gewas;Variant;Teeltgroep;Zaaiperiode;Oogst periode;Bijzonderheden;Jan B;Jan M;Jan E;Feb B;Feb M;Feb E;Mrt B;Mrt M;Mrt E;Apr B;Apr M;Apr E;Mei B;Mei M;Mei E;Jun B;Jun M;Jun E;Jul B;Jul M;Jul E;Aug B;Aug M;Aug E;Sep B;Sep M;Sep E;Okt B;Okt M;Okt E;Nov B;Nov M;Nov E;Dec B;Dec M;Dec E
Sla;Kropsla;Bladgewassen;Mrt-Aug;Apr-Okt;Schaduw tolerant;;;;kvz;kvz;kvz;bz;bz;bz;bz;bz;bz;bu;bu;bu;o;o;o;o;o;o;o;o;o;o;o;o;;;;;
Tomaat;Roma;Vruchtgewassen;Feb-Apr;Jul-Okt;Kas nodig;;kvz;kvz;kvz;kvz;;;ku;ku;ku;;;x;x;x;x;x;o;o;o;o;o;o;o;;;;;;;
Wortel;Nantes;Wortelgewassen;Mrt-Jul;Jun-Nov;Diepe grond;;;;;;;bz;bz;bz;bz;bz;bz;bz;bz;bz;x;x;x;o;o;o;o;o;o;o;o;o;o;o;o;;;;
Courgette;Groene;Vruchtgewassen;Apr-Mei;Jun-Sep;Veel ruimte;;;;;;;kvz;kvz;kvz;bu;bu;bu;x;x;x;o;o;o;o;o;o;o;o;o;;;;;;;
Bonen;Snijbonen;Peulvruchten;Apr-Jul;Jun-Sep;Niet te vroeg;;;;;;;;;;bz;bz;bz;bz;bz;bz;x;x;o;o;o;o;o;o;o;o;o;;;;;;;;
Spinazie;Winter;Bladgewassen;Aug-Okt;Okt-Apr;Koude tolerant;;;;;;;;;;;;;;;;;;;;;;bz;bz;bz;bz;bz;bz;o;o;o;o;o;o;o;o;o
Bieten;Rode;Wortelgewassen;Apr-Jul;Jul-Nov;Goed bewaarbaar;;;;;;;;bz;bz;bz;bz;bz;bz;bz;x;x;x;o;o;o;o;o;o;o;o;o;o;o;o;;;;
Pompoen;Butternut;Vruchtgewassen;Apr-Mei;Sep-Okt;Veel ruimte;;;;;;;kvz;kvz;kvz;bu;bu;bu;x;x;x;x;x;x;x;x;o;o;o;o;;;;;;;`;

export const VOORBEELD_TEELTPLAN_CSV = `Jaar;Sectie;Bed;Deel van bed;Gewas;Teelt;Jan B;Jan M;Jan E;Feb B;Feb M;Feb E;Mrt B;Mrt M;Mrt E;Apr B;Apr M;Apr E;Mei B;Mei M;Mei E;Jun B;Jun M;Jun E;Jul B;Jul M;Jul E;Aug B;Aug M;Aug E;Sep B;Sep M;Sep E;Okt B;Okt M;Okt E;Nov B;Nov M;Nov E;Dec B;Dec M;Dec E;Opmerkingen
2025;A;1;Noord;Sla;Voorjaarsteelt;;;;kvz;kvz;;bu;bu;;o;o;o;o;;;;;;;;;;;;;;;;;;Eerste sla
2025;A;1;Zuid;Sla;Zomerteelt;;;;;;;;kvz;kvz;;bu;bu;;o;o;o;o;;;;;;;;;;;;;;Tweede sla
2025;A;2;Heel bed;Wortel;Zomerteelt;;;;;;;bz;bz;bz;x;x;x;x;x;x;o;o;o;o;o;o;;;;;;;;;;Nantes
2025;A;3;Heel bed;Bieten;Zomerteelt;;;;;;;bz;bz;;x;x;x;x;x;x;o;o;o;o;o;o;;;;;;;;;;Rode bieten
2025;B;1;Heel bed;Tomaat;Kasteelt;;kvz;kvz;kvz;;;;ku;ku;;x;x;x;x;x;o;o;o;o;o;o;o;;;;;;;;Roma tomaten
2025;B;3;Heel bed;Courgette;Zomerteelt;;;;;;;kvz;kvz;;bu;bu;;x;x;o;o;o;o;o;o;o;;;;;;;;;;;;Groene courgette
2025;C;2;Heel bed;Bonen;Zomerteelt;;;;;;;;;;;bz;bz;bz;x;x;x;o;o;o;o;o;o;o;;;;;;;;;;Snijbonen
2025;D;2;Heel bed;Spinazie;Winterteelt;;;;;;;;;;;;;;;;;;;;;;bz;bz;bz;x;x;o;o;o;o;o;o;o;Winterspinarie
2025;E;1;Heel bed;Pompoen;Zomerteelt;;;;;;;kvz;kvz;;bu;bu;;x;x;x;x;x;x;x;x;o;o;o;o;;;;;;;;;;Butternut`;
