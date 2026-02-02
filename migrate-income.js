// ============================================
// TEMPORARY: Income Data Migration Function
// Execute this ONCE in browser console to migrate legacy income data
// ============================================
window.migrateIncomeDates = async function () {
    try {
        console.log('🔄 Starting income migration...');

        if (!currentUser) {
            console.error('❌ No user logged in!');
            return;
        }

        // Get all income records for current user
        const incomeQuery = query(
            collection(db, 'income'),
            where('userId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(incomeQuery);
        console.log(`📊 Found ${snapshot.docs.length} income records`);

        let updated = 0;
        let alreadyHasDate = 0;
        let isFirstRecord = true; // Track first record for February

        for (const docSnapshot of snapshot.docs) {
            const data = docSnapshot.data();

            // Skip if already has a date
            if (data.date) {
                alreadyHasDate++;
                console.log(`✓ "${data.name}" already has date: ${data.date}`);
                continue;
            }

            // Assign date: First record gets February, rest get January
            const targetDate = isFirstRecord ? '2026-02-01' : '2026-01-15';

            await updateDoc(doc(db, 'income', docSnapshot.id), {
                date: targetDate
            });

            updated++;
            console.log(`✓ Updated "${data.name}" with date: ${targetDate}`);

            isFirstRecord = false; // After first record, all go to January
        }

        console.log(`\n✅ Migration complete!`);
        console.log(`   - Updated: ${updated} records`);
        console.log(`   - Already had dates: ${alreadyHasDate} records`);
        console.log(`   - Total: ${snapshot.docs.length} records`);
        console.log(`\n🔄 Refreshing dashboard...`);

        // Refresh the page to see changes
        location.reload();

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
};

console.log('📝 Migration function loaded. Run: migrateIncomeDates()');
