# STCG and LTCG
  1. Add STCG and LTCG Calculations to get actual return and actual return growth
  2. Use this returned value in Dashboard and Goal

# UI Improvements
  1. Charts are static-width - width={isMobile ? 300 : 500} hardcoded. Doesn't respect container width.
  
Wrong Concepts/Implementations
Architectural Issues:

Issue	Location	Why It's Wrong
Services instantiate their own dependencies	DashboardService.ts:41-43, AssetService.ts:15-18	No dependency injection = untestable, tight coupling
Singleton IRRCalculator	IRRCalculator.ts:9-15	Unnecessary singleton for a stateless calculator
Custom IRR implementation	IRRCalculator.ts	You have xirr npm package in deps but don't use it! Why reinvent?
No repository interface	All repositories	Direct class references, no abstraction for testing
Mixed async patterns	AssetService.ts:33-37	.then() chaining mixed with async/await in same file
Domain Modeling Issues:

Issue	Location	Why It's Wrong
ValueModel enum doesn't cover all cases	ValueModel.ts	No model for Gold (weight × spot price), Real Estate (manual appraisal), or NSC/KVP (specific govt rates)
Currency is an enum with symbols	Currency.ts	Symbols as values ('₹') is wrong. Should be ISO codes + separate display formatter
Expense uses Currency enum but Asset uses string	Expense.ts:6 vs Asset.ts:11	Type inconsistency
No distinction between realized/unrealized P&L	Asset.getProfitLoss()	Selling units isn't tracked separately
Investment doesn't track sell transactions	Investment.ts	Only "buy" logic, no partial exits
Goals don't link to actual SIPs	Goal.ts	Allocation is static percentage, not actual SIP mapping
Calculation Issues:

Issue	Location	Why It's Wrong
IRR capped at ±100%	IRRCalculator.ts:58-61	Crypto could exceed this. Cap hides bad data
Years calculated with 365	IRRCalculator.ts:69, 117	Should be 365.25 for leap years (you did it right in Goal.ts!)
getWeightedValueOn divides by totalQty	Asset.ts:131-133	This weighting logic assumes linear NAV growth - incorrect for volatile assets
Expense.getMonthYear() returns weird format	Expense.ts:32-34	Returns "0:2024" for Jan 2024 - not usable
Code Quality Issues:

Issue	Why It's Wrong
Dead code: break after return	Asset.ts:251, 255
Console.log left in production code	ScriptExecutor.ts:29, 38-40
Unnecessary re-creation of entities	AssetService.ts:76-82 creates new Investment twice
