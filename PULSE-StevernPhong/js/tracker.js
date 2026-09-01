/* ============================================
   P.U.L.S.E Dashboard - Weekly Tracker Module
   Additional tracking utilities
   ============================================ */

const Tracker = {
    WEEKLY_APPROACH_TARGET: 90,
    WEEKLY_PRESENTATION_TARGET: 10,

    /**
     * Calculate current week's progress
     * @param {Array} activities - All activities from all tabs
     * @returns {object} Progress data
     */
    getWeeklyProgress(activities) {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        let approaches = 0;
        let presentations = 0;
        let closings = 0;
        let srs = 0;

        const dayBreakdown = {
            Monday: { approaches: 0, presentations: 0, closings: 0 },
            Tuesday: { approaches: 0, presentations: 0, closings: 0 },
            Wednesday: { approaches: 0, presentations: 0, closings: 0 },
            Thursday: { approaches: 0, presentations: 0, closings: 0 },
            Friday: { approaches: 0, presentations: 0, closings: 0 },
            Saturday: { approaches: 0, presentations: 0, closings: 0 },
            Sunday: { approaches: 0, presentations: 0, closings: 0 }
        };

        activities.forEach(activity => {
            if (!activity.date) return;
            
            const actDate = new Date(activity.date);
            if (actDate < startOfWeek || actDate > endOfWeek) return;

            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][actDate.getDay()];
            
            switch (activity.type) {
                case 'APPROACH':
                    approaches++;
                    if (dayBreakdown[dayName]) dayBreakdown[dayName].approaches++;
                    break;
                case 'PRESENTATION':
                    presentations++;
                    if (dayBreakdown[dayName]) dayBreakdown[dayName].presentations++;
                    break;
                case 'CLOSING':
                    closings++;
                    if (dayBreakdown[dayName]) dayBreakdown[dayName].closings++;
                    break;
                case 'SR':
                    srs++;
                    break;
            }
        });

        return {
            approaches,
            presentations,
            closings,
            srs,
            approachPercent: Math.min((approaches / this.WEEKLY_APPROACH_TARGET) * 100, 100),
            presentationPercent: Math.min((presentations / this.WEEKLY_PRESENTATION_TARGET) * 100, 100),
            dayBreakdown
        };
    },

    /**
     * Get streak info (consecutive weeks meeting target)
     * @param {Array} weeklyHistory - Array of { week, approaches, presentations }
     * @returns {object} Streak data
     */
    getStreakInfo(weeklyHistory) {
        let streak = 0;
        
        for (let i = weeklyHistory.length - 1; i >= 0; i--) {
            const week = weeklyHistory[i];
            if (week.approaches >= this.WEEKLY_APPROACH_TARGET) {
                streak++;
            } else {
                break;
            }
        }
        
        return { approachStreak: streak };
    },

    /**
     * Generate motivational message based on progress
     * @param {object} progress - Progress data
     * @returns {string} Message
     */
    getMotivationMessage(progress) {
        const maxPercent = Math.max(progress.approachPercent, progress.presentationPercent);
        
        if (maxPercent >= 100) return '🎉 Amazing! You crushed this week\'s targets!';
        if (maxPercent >= 75) return '💪 Almost there! Keep pushing!';
        if (maxPercent >= 50) return '📈 Halfway there! Great progress!';
        if (maxPercent >= 25) return '🌱 Good start! Stay consistent!';
        return '🚀 Let\'s go! Every approach counts!';
    }
};
