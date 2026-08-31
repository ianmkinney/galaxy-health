import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getTheme, planetAccents, spacing, typography } from '../theme';
import { galleyRepo, todayKey } from '../db/repositories';
import { useGalaxy } from '../state/GalaxyContext';
import { EVENTS, emit } from '../state/eventBus';
import { SIGNAL_KINDS } from '../state/signalKinds';
import { PLANET_IDS } from '../galaxy/planets';
import { usePlanetInbox } from '../hooks/usePlanetInbox';
import ScreenShell from '../components/ScreenShell';
import HoloPanel from '../components/HoloPanel';
import StatReadout from '../components/StatReadout';
import GlowButton from '../components/GlowButton';
import LogRow from '../components/LogRow';
import InboxPanel from '../components/InboxPanel';
import SystemsLedger from '../components/SystemsLedger';
import { ChipRow, Field } from '../components/Field';

const accent = planetAccents.galley;

const TABS = [
  { value: 'fuel', label: 'Fuel' },
  { value: 'systems', label: 'Systems' },
  { value: 'recipes', label: 'Recipes' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'plan', label: 'Plan' },
];

const SLOTS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const GalleyScreen = () => {
  const theme = getTheme(true);
  const { planetName, sendSignal } = useGalaxy();
  const { signals } = usePlanetInbox(PLANET_IDS.GALLEY);

  const [meals, setMeals] = useState([]);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 });
  const [form, setForm] = useState({
    name: '',
    slot: 'lunch',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });
  const [tab, setTab] = useState('fuel');
  const [recipes, setRecipes] = useState([]);
  const [pantry, setPantry] = useState([]);
  const [grocery, setGrocery] = useState([]);
  const [plans, setPlans] = useState([]);
  const [recipeTitle, setRecipeTitle] = useState('');
  const [pantryName, setPantryName] = useState('');
  const [groceryName, setGroceryName] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const day = todayKey();
    const [rows, sums, recs, hold, list, week] = await Promise.all([
      galleyRepo.listForDay(day),
      galleyRepo.totalsForDay(day),
      galleyRepo.listRecipes().catch(() => []),
      galleyRepo.listPantry().catch(() => []),
      galleyRepo.listGrocery().catch(() => []),
      galleyRepo.listPlans(day).catch(() => []),
    ]);
    setMeals(rows);
    setTotals(sums);
    setRecipes(recs);
    setPantry(hold);
    setGrocery(list);
    setPlans(week);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canSave = form.name.trim().length > 0 && !saving;

  const handleLog = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const meal = {
        name: form.name.trim(),
        slot: form.slot,
        calories: form.calories,
        protein: form.protein,
        carbs: form.carbs,
        fat: form.fat,
      };
      const id = await galleyRepo.log(meal);

      // The fuel manifest goes to Atlas so training can be planned against it.
      // This is the signal the Bridge renders as a ship.
      await sendSignal(
        SIGNAL_KINDS.MACROS_LOGGED,
        {
          name: meal.name,
          calories: Number(meal.calories) || 0,
          protein: Number(meal.protein) || 0,
          carbs: Number(meal.carbs) || 0,
          fat: Number(meal.fat) || 0,
        },
        `galley_meals:${id}`
      );

      setForm({ name: '', slot: form.slot, calories: '', protein: '', carbs: '', fat: '' });
      await load();
      emit(EVENTS.DATA_CHANGED, { source: PLANET_IDS.GALLEY });
    } finally {
      setSaving(false);
    }
  }, [canSave, form, load, sendSignal]);

  const handleDelete = useCallback(
    async (id) => {
      await galleyRepo.remove(id);
      await load();
      emit(EVENTS.DATA_CHANGED, { source: PLANET_IDS.GALLEY });
    },
    [load]
  );

  const burnedIn = signals
    .filter((signal) => signal.kind === SIGNAL_KINDS.BURN_LOGGED)
    .reduce((sum, signal) => sum + (Number(signal.payload?.burn) || 0), 0);
  const net = round(totals.calories - burnedIn);

  return (
    <ScreenShell
      theme={theme}
      accent={accent}
      subtitle="Food & fuel"
      title={planetName(PLANET_IDS.GALLEY)}
      tagline="Logs, files, and systems raise this world. Same household loop as Food Dude."
      planetId={PLANET_IDS.GALLEY}
      footer={
        tab === 'fuel' ? (
          <GlowButton
            theme={theme}
            tone={accent.mid}
            label={saving ? 'Logging…' : 'Log fuel & transmit'}
            icon="flame"
            onPress={handleLog}
            disabled={!canSave}
          />
        ) : null
      }
    >
      <ChipRow
        theme={theme}
        accent={accent}
        label="Hold"
        options={TABS}
        value={tab}
        onChange={setTab}
      />
      {tab === 'fuel' ? (
        <>
      <HoloPanel theme={theme} title="Fuel balance — today" accent={accent.mid} index={0}>
        <View style={styles.stats}>
          <StatReadout theme={theme} label="In" value={round(totals.calories)} unit="kcal" tone={accent.mid} />
          <StatReadout theme={theme} label="Burned" value={round(burnedIn)} unit="kcal" tone={planetAccents.atlas.mid} />
          <StatReadout
            theme={theme}
            label="Net"
            value={net > 0 ? `+${net}` : `${net}`}
            unit="kcal"
            tone={net > 0 ? theme.palette.status.warn : theme.palette.status.good}
          />
          <StatReadout theme={theme} label="Protein" value={round(totals.protein)} unit="g" />
        </View>
        <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
          Burn figures arrive as transmissions from {planetName(PLANET_IDS.ATLAS)} — no cloud, no key.
        </Text>
      </HoloPanel>

      <HoloPanel theme={theme} title="New entry" accent={accent.mid} index={1}>
        <Field
          theme={theme}
          label="Dish"
          value={form.name}
          onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
          placeholder="Miso salmon bowl"
          returnKeyType="done"
        />
        <ChipRow
          theme={theme}
          accent={accent}
          label="Slot"
          options={SLOTS}
          value={form.slot}
          onChange={(slot) => setForm((prev) => ({ ...prev, slot }))}
        />
        <View style={styles.macroRow}>
          <Field
            theme={theme}
            label="Calories"
            unit="kcal"
            style={styles.macroField}
            value={form.calories}
            onChangeText={(calories) => setForm((prev) => ({ ...prev, calories }))}
            keyboardType="numeric"
            placeholder="0"
          />
          <Field
            theme={theme}
            label="Protein"
            unit="g"
            style={styles.macroField}
            value={form.protein}
            onChangeText={(protein) => setForm((prev) => ({ ...prev, protein }))}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
        <View style={styles.macroRow}>
          <Field
            theme={theme}
            label="Carbs"
            unit="g"
            style={styles.macroField}
            value={form.carbs}
            onChangeText={(carbs) => setForm((prev) => ({ ...prev, carbs }))}
            keyboardType="numeric"
            placeholder="0"
          />
          <Field
            theme={theme}
            label="Fat"
            unit="g"
            style={styles.macroField}
            value={form.fat}
            onChangeText={(fat) => setForm((prev) => ({ ...prev, fat }))}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
      </HoloPanel>

      <HoloPanel
        theme={theme}
        title="Today's manifest"
        meta={`${meals.length} logged`}
        accent={accent.mid}
        index={2}
      >
        {meals.length === 0 ? (
          <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
            Nothing logged yet. The first entry launches a ship to {planetName(PLANET_IDS.ATLAS)}.
          </Text>
        ) : (
          meals.map((meal, index) => (
            <LogRow
              key={meal.id}
              theme={theme}
              accent={accent}
              index={index}
              title={meal.name}
              meta={`${round(meal.calories)} kcal · ${round(meal.protein)}p / ${round(meal.carbs)}c / ${round(meal.fat)}f`}
              detail={meal.slot}
              onDelete={() => handleDelete(meal.id)}
            />
          ))
        )}
      </HoloPanel>
        </>
      ) : null}

      {tab === 'systems' ? (
        <SystemsLedger theme={theme} accent={accent} planetId={PLANET_IDS.GALLEY} />
      ) : null}

      {tab === 'recipes' ? (
        <HoloPanel theme={theme} title="Recipe book" meta={`${recipes.length}`} accent={accent.mid} index={0}>
          <Field
            theme={theme}
            label="Title"
            value={recipeTitle}
            onChangeText={setRecipeTitle}
            placeholder="Lentil soup"
          />
          <GlowButton
            theme={theme}
            tone={accent.mid}
            label="Save recipe"
            onPress={async () => {
              if (!recipeTitle.trim()) return;
              await galleyRepo.addRecipe({ title: recipeTitle.trim() });
              setRecipeTitle('');
              await load();
            }}
          />
          {recipes.map((row, index) => (
            <LogRow key={row.id} theme={theme} accent={accent} index={index} title={row.title} meta={row.tags || 'file'} />
          ))}
        </HoloPanel>
      ) : null}

      {tab === 'pantry' ? (
        <HoloPanel theme={theme} title="Pantry" meta={`${pantry.length}`} accent={accent.mid} index={0}>
          <Field theme={theme} label="Item" value={pantryName} onChangeText={setPantryName} placeholder="Eggs" />
          <GlowButton
            theme={theme}
            tone={accent.mid}
            label="Stow"
            onPress={async () => {
              if (!pantryName.trim()) return;
              await galleyRepo.addPantry({ name: pantryName.trim(), quantity: 1 });
              setPantryName('');
              await load();
            }}
          />
          {pantry.map((row, index) => (
            <LogRow
              key={row.id}
              theme={theme}
              accent={accent}
              index={index}
              title={row.name}
              meta={`${row.quantity}${row.unit ? ` ${row.unit}` : ''}`}
            />
          ))}
        </HoloPanel>
      ) : null}

      {tab === 'grocery' ? (
        <HoloPanel theme={theme} title="Grocery" meta={`${grocery.filter((g) => !g.checked).length} open`} accent={accent.mid} index={0}>
          <Field theme={theme} label="Need" value={groceryName} onChangeText={setGroceryName} placeholder="Blueberries" />
          <GlowButton
            theme={theme}
            tone={accent.mid}
            label="Add"
            onPress={async () => {
              if (!groceryName.trim()) return;
              await galleyRepo.addGrocery({ name: groceryName.trim(), quantity: 1 });
              setGroceryName('');
              await load();
            }}
          />
          {grocery.map((row, index) => (
            <LogRow
              key={row.id}
              theme={theme}
              accent={accent}
              index={index}
              title={row.name}
              meta={row.checked ? 'checked' : 'open'}
              onDelete={() => galleyRepo.toggleGrocery(row.id, !row.checked).then(load)}
            />
          ))}
        </HoloPanel>
      ) : null}

      {tab === 'plan' ? (
        <HoloPanel theme={theme} title="Today's sittings" meta={`${plans.length}`} accent={accent.mid} index={0}>
          <Field theme={theme} label="Title" value={planTitle} onChangeText={setPlanTitle} placeholder="Salmon + greens" />
          <GlowButton
            theme={theme}
            tone={accent.mid}
            label="Add dinner"
            onPress={async () => {
              if (!planTitle.trim()) return;
              await galleyRepo.addPlan({ title: planTitle.trim(), slot: 'dinner' });
              setPlanTitle('');
              await load();
            }}
          />
          {plans.map((row, index) => (
            <LogRow key={row.id} theme={theme} accent={accent} index={index} title={row.title} meta={row.slot} />
          ))}
        </HoloPanel>
      ) : null}

      {tab === 'fuel' ? (
        <InboxPanel
          theme={theme}
          accent={accent}
          signals={signals}
          planetName={planetName}
          index={3}
          emptyHint={`Log a session on ${planetName(PLANET_IDS.ATLAS)} and its burn report lands here.`}
        />
      ) : null}
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  hint: { fontSize: typography.sizes.xs, marginTop: spacing.md, lineHeight: 17 },
  macroRow: { flexDirection: 'row', gap: spacing.md },
  macroField: { flex: 1 },
});

export default GalleyScreen;
