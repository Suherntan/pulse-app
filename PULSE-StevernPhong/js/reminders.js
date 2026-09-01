/* P.U.L.S.E Dashboard - Reminders Module */

const Reminders = {
  getUpcomingBirthdays(clients, daysAhead) {
    daysAhead = daysAhead || 7;
    const today = new Date();
    const future = new Date(today);
    future.setDate(today.getDate() + daysAhead);
    return clients.filter(function(c){return c.birthday;}).map(function(c){
      var bd = new Date(c.birthday);
      var yb = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
      return yb >= today && yb <= future ? Object.assign({},c,{daysUntil:Math.ceil((yb-today)/86400000)}) : null;
    }).filter(Boolean).sort(function(a,b){return a.daysUntil-b.daysUntil});
  },
  getUpcomingPayments(clients, daysAhead) {
    daysAhead = daysAhead || 7;
    const today = new Date(); today.setHours(0,0,0,0);
    const future = new Date(today); future.setDate(today.getDate() + daysAhead);
    return clients.filter(function(c){return c.paymentDue;}).map(function(c){
      var pd = new Date(c.paymentDue);
      return pd >= today && pd <= future ? Object.assign({},c,{daysUntil:Math.ceil((pd-today)/86400000)}) : null;
    }).filter(Boolean).sort(function(a,b){return a.daysUntil-b.daysUntil});
  }
};
const RemindersModule = Reminders;