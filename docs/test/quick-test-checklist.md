# Discover Page - Quick Test Checklist

**Version:** 1.0 | **Date:** 2025-11-08

Use this checklist for rapid smoke testing or sanity checks before releases.

---

## Pre-Flight Check (2 minutes)

**Setup:**
```javascript
// Run in browser console
localStorage.clear();
location.reload();
```

- [ ] Navigate to `http://autos.minilab/discover`
- [ ] Page loads without errors
- [ ] DevTools Console shows no errors
- [ ] All panels visible

---

## Phase 1: Basic Functionality (10 minutes)

### Visual Design (1 min)
- [ ] Title "Vehicle Discovery" is RED
- [ ] Panel headers are SHORTER (reduced padding)
- [ ] Panel spacing is TIGHTER (8px gaps)
- [ ] Buttons are THINNER (reduced padding)
- [ ] Red theme throughout (no blue)

### Panel Interaction (2 min)
- [ ] All panels collapse/expand
- [ ] Drag handle appears on hover
- [ ] Can reorder panels via drag-drop
- [ ] Panel order persists after refresh
- [ ] "Reset Panel Order" button works

### Filters & Selection (3 min)
- [ ] Add manufacturer filter → Results update
- [ ] Add year range filter → Results update
- [ ] Select model in picker → Results update
- [ ] URL updates with all filters
- [ ] "Clear All" removes everything

### Results Table (2 min)
- [ ] Table displays vehicle data
- [ ] Column sorting works
- [ ] VIN expansion shows instances
- [ ] Pagination works (Next/Prev)
- [ ] Column visibility toggle works

### Charts (1 min)
- [ ] Four charts render correctly
- [ ] Charts update when filters change
- [ ] Hover tooltips work

### State Persistence (1 min)
- [ ] Refresh page → State restores from URL
- [ ] Browser Back → Previous state
- [ ] Browser Forward → Next state

---

## Phase 2: Pop-Out Features (10 minutes)

### Pop-Out Opening (2 min)
- [ ] Hover panel header → Pop-out button appears
- [ ] Pop-out button is RED and LARGER
- [ ] Click pop-out → New window opens (1200×800)
- [ ] Main page shows placeholder
- [ ] Panel content renders in pop-out

### Panel Restoration (1 min)
- [ ] Close pop-out window
- [ ] Panel returns to main page
- [ ] Panel position correct
- [ ] Panel state preserved

### State Sync: Main → Pop-Out (2 min)
- [ ] Pop out "Vehicle Results"
- [ ] Select model on main page
- [ ] Pop-out table updates immediately
- [ ] Add filter on main page
- [ ] Pop-out reflects filter

### State Sync: Pop-Out → Main (2 min)
- [ ] Pop out "Make/Model Picker"
- [ ] Select model in pop-out
- [ ] Main page URL updates
- [ ] Main page results update
- [ ] All panels on main page sync

### Multiple Pop-Outs (2 min)
- [ ] Pop out 3 panels simultaneously
- [ ] All pop-outs render correctly
- [ ] Change filter on main page
- [ ] All 3 pop-outs update
- [ ] Close all pop-outs → All panels restore

### Edge Cases (1 min)
- [ ] Rapid pop-out/close (5× cycles) → No crash
- [ ] Refresh main page with pop-out open → Pop-out survives
- [ ] Pop-up blocker enabled → Graceful error message

---

## Critical Path Test (5 minutes)

**Scenario:** User researches Ford F-150 vs Chevy Corvette (2015-2020)

### Steps:
1. [ ] Pop out "Interactive Charts" to secondary monitor
2. [ ] On main page, select "Ford: F-150" in picker
3. [ ] Observe charts update in pop-out
4. [ ] Add year range filter: 2015-2020
5. [ ] Charts update with filtered data
6. [ ] Add "Chevrolet: Corvette" to selection
7. [ ] Observe charts now show both models
8. [ ] Click row in results table
9. [ ] VIN instances expand
10. [ ] Export data (if available)
11. [ ] Close pop-out → Charts return to main page

**Expected:** No errors, smooth workflow, all updates instant

---

## Performance Check (2 minutes)

### Load Test:
- [ ] Select "All" manufacturers (no filter)
- [ ] Results load within 3 seconds
- [ ] Table remains responsive
- [ ] Pagination shows 20 results per page

### Memory Check (DevTools):
- [ ] Open Memory Profiler
- [ ] Pop out all panels
- [ ] Close all panels
- [ ] Repeat 5 times
- [ ] Memory returns to baseline (no leaks)

---

## Sign-Off

**Date:** _______________
**Tester:** _______________
**Browser:** _______________
**Result:** ✅ PASS / ❌ FAIL

**Issues Found:** _______________

**Notes:** _______________

---

## Quick Bug Report

If you find a bug during smoke testing:

1. **Take screenshot**
2. **Copy console errors**
3. **Note steps to reproduce**
4. **File bug using template in main test plan**

**Critical bugs:** Immediately notify dev team
**Minor bugs:** Document and continue testing

---

## Automated Checks (Future)

When automated tests are implemented:

- [ ] Run E2E test suite
- [ ] Check code coverage (>80%)
- [ ] Run visual regression tests
- [ ] Performance benchmark passed

---

**Quick Reference:** For full test plan, see `discover-page-manual-test-plan.md`
