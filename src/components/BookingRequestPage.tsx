export default function BookingRequestPage() {
  return (
    <div className="min-h-screen bg-bg-primary p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-bg-secondary border border-border-muted rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-accent-soft rounded-full p-4 sm:p-6">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-3">
            Booking Request
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-text-secondary text-center mb-6">
            Page Under Construction
          </p>

          {/* Description */}
          <div className="bg-bg-elevated border border-border-muted rounded-lg p-4 mb-6">
            <p className="text-sm sm:text-base text-text-secondary text-center leading-relaxed">
              We're working hard to bring you the booking request feature. 
              Soon you'll be able to submit booking requests directly from this page.
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-xs sm:text-sm font-medium bg-accent-soft text-accent border border-accent/30">
              <span className="w-2 h-2 bg-accent rounded-full mr-2 animate-pulse"></span>
              Coming Soon
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              disabled
              className="w-full px-4 py-3 bg-bg-elevated text-text-muted rounded-lg font-medium text-sm sm:text-base cursor-not-allowed border border-border-muted"
            >
              Create Booking
            </button>
            <button
              disabled
              className="w-full px-4 py-3 bg-bg-elevated text-text-muted rounded-lg font-medium text-sm sm:text-base cursor-not-allowed border border-border-muted"
            >
              View My Bookings
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-border-muted">
            <p className="text-xs sm:text-sm text-text-muted text-center">
              Stay tuned for updates. This feature will be available shortly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
