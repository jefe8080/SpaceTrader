/** PRD17: discard retired consumer accounts without paying out or changing travel wallets. */
export function migrateCivilAccounts(market){
  for(const h of [market?.homeworld,market?.economy])if(h?.civil){
    for(const key of ['budget','purchaseLimited','unspentExpired'])delete h.civil[key];
  }
}
