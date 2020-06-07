'use strict';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// simple factorial function
function factorial(num) {
    var rval=1;
    for (var i = 2; i <= num; i++)
        rval = rval * i;
    return rval;
}

// python-like
let zip = (...rows) => [...rows[0]].map((_,c) => rows.map(row => row[c]));

// chi-sqeare table
let criticalValues = {
  1:  3.841,
  2:  5.991,
  3:  7.815,
  4:  9.488,
  5:  11.070,
  6:  12.592,
  7:  14.067,
  8:  15.507,
  9:  16.919,
  10: 18.301,
  11: 19.657,
  12: 21.026,
  13: 22.362,
  14: 23.658,
  15: 24.996,
  16: 26.269,
  17: 27.587,
  18: 28.869,
  19: 30.144,
  20: 31.410
}

// GLOBAL PARAMS
const T = 4;
const N = 6000;
const MAX = T*8*2; // border for distributions
                   // очень кривой, но хоть какой-то

class RandomFlow {
  constructor(rate) {
    this.rate = rate;
    this.events = [];
    for (let i = 0; i < MAX; i++) this.events.push(0);
  }

  async start() {
    for (let i = 0; i < N; i++) {
      let n = this._getNumberOfEvents(this.rate);
      try {
        this.events[n] += 1;
      } catch(e) {
        console.log(e);
        continue;
      }
    }

    for (let i = 0; i < MAX; i++) this.events[i] /= N;
  }

  _getNumberOfEvents(rate) {
    let i = 0;
    let acc = 0;
    let P = Math.random();
    while (true) {
      let prob = (Math.pow(rate * T, i) / factorial(i)) * Math.pow(Math.E, -rate * T);
      acc += prob;
      if (P < acc) {
        return i;
      } else i++;
    }
  }
}

// simulate both
class DoubleRandomFlow extends RandomFlow {
  constructor(rate1, rate2) {
    super();
    this.rate1 = rate1;
    this.rate2 = rate2;
    this.events = [];
    for (let i = 0; i < MAX; i++) this.events.push(0);
  }

  async start() {
    for (let i = 0; i < N; i++) {
      let n1 = this._getNumberOfEvents(this.rate1);
      let n2 = this._getNumberOfEvents(this.rate2);
      try {
        this.events[n1 + n2] += 1;
      } catch(e) {
        console.log(e);
        continue;
      }
    }

    for (let i = 0; i < MAX; i++) this.events[i] /= N;
  }
}

class RealPuassonFlow extends RandomFlow {
  constructor(rate) {
    super(rate);
  }

  async start() {
    for (let m = 0; m < MAX; m++) {
      let v = this._getNumberOfEvents(this.rate, m);
      this.events[m] = v;
    }
  }

  _getNumberOfEvents(rate, i) {
    return (Math.pow(rate * T, i) / factorial(i)) * Math.pow(Math.E, -rate * T);
  }
}

function drawChart(d, elem) {
    var data = new google.visualization.DataTable();
    data.addColumn('number', 'n');
    data.addColumn('number', 'p');

    let e = []
    for (let i = 0; i < d.length; i++) e.push(i);
    data.addRows(zip(e, d));

    // Set chart options
    var options = {'title':'Flow Simulation',
                   'width':400,
                   'height':250};

    var chart = new google.visualization.LineChart(elem);
    chart.draw(data, options);
}

document.addEventListener("DOMContentLoaded", () => {
  google.charts.load('current', {'packages':['corechart']});

  google.charts.setOnLoadCallback(async () => {
    this.document.getElementById("T").innerHTML = "T = " + T;
    this.document.getElementById("N").innerHTML = "N = " + N;

    let r1 = 3;
    let r2 = 5;

    let flow1 = new RandomFlow(r1);
    let flow2 = new RandomFlow(r2);
    let realFlow  = new RealPuassonFlow(r1 + r2);
    let doubleFlow = new DoubleRandomFlow(r1, r2);

    await Promise.all([
      flow1.start(),
      flow2.start(),
      realFlow.start(),
      doubleFlow.start()
    ]);

    // DEBUG
    // console.log(flow1.events);
    // console.log(flow2.events);
    // console.log(realFlow.events);
    // console.log(doubleFlow.events);

    drawChart(flow1.events, document.getElementById('chart1'));
    drawChart(flow2.events, document.getElementById('chart2'));
    drawChart(doubleFlow.events, document.getElementById('chart_merged'));
    drawChart(realFlow.events, document.getElementById('chart'));

    this.document.getElementById("rate1").innerHTML = r1;
    this.document.getElementById("rate2").innerHTML = r2;

    let k = 8; // степени свободы
    let chi = 0;
    let accepted = false;

    let accReal = 0;
    let acc = 0;

    let i = 0;
    while (i < MAX) {
      if (i % (k+1) == k) {
        chi += Math.pow((acc - accReal) * N, 2) / (accReal*N);
        acc = 0;
        accReal = 0;
      }
      acc += doubleFlow.events[i];
      accReal += realFlow.events[i];
      i++;
    }
    chi += Math.pow((acc - accReal) * N, 2) / (accReal*N);

    if (chi < criticalValues[k]) {
      accepted = true;
    }

    this.document.getElementById("chi").innerHTML = chi.toFixed(3);
    this.document.getElementById("k").innerHTML = k;

    this.document.getElementById("accepted").innerHTML = accepted ? "accepted" : "declined";
    this.document.getElementById("accepted").classList = accepted ? "text-success" : "text-danger";
  });

});
