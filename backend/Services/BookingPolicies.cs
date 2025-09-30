namespace backend.Services
{
    public static class BookingPolicies
    {
        public const int CheckinLeadMinutes = 30;
        public const int CheckinGraceMinutes = 30;
        public const int AutoCancellationSweepMinutes = 5;
        public const int AutoCheckoutSweepMinutes = 5;
        public const int AutoCheckoutHour = 18;
        public const int AutoCheckoutMinute = 5;
    }
}
