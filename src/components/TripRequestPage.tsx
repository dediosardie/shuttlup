export default function TripRequestPage() {
  return (
    <div className="min-h-screen bg-bg-primary p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-bg-secondary border border-border-muted rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-accent-soft rounded-full p-4 sm:p-6">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-3">
            Trip Request
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-text-secondary text-center mb-6">
            Page Under Construction
          </p>

          {/* Description */}
          <div className="bg-bg-elevated border border-border-muted rounded-lg p-4 mb-6">
            <p className="text-sm sm:text-base text-text-secondary text-center leading-relaxed">
              We're working hard to bring you the trip request feature. 
              Soon you'll be able to request trips directly from this page.
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
              Request New Trip
            </button>
            <button
              disabled
              className="w-full px-4 py-3 bg-bg-elevated text-text-muted rounded-lg font-medium text-sm sm:text-base cursor-not-allowed border border-border-muted"
            >
              View My Requests
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
