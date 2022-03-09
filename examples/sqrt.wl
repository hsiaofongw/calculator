sqrt[x_] := sqrtIter[1, x];

sqrtIter[guess_, x_] := If[
  good[guess, x], 
  guess, 
  sqrtIter[
    improve[guess, x], 
    x
  ]
];

improve[guess_, x_] := average[guess, Divide[x, guess]];

average[x_, y_] := Divide[Plus[x, y], 2];

good[guess_, x_] := LessThan[abs[Minus[Square[guess], x]], 0.001];

abs[x_] := If[x < 0, Negative[x], x];

sqrt[1];
sqrt[2];
sqrt[3];
sqrt[4];
sqrt[10];