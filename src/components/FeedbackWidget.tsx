import React, { useState } from 'react';
import styles from './FeedbackWidget.module.css';
import { trackEvent } from '../utils/analytics.ts';

interface FeedbackEntry {
  id: string;
  timestamp: string;
  user: string;
  rating: number;
  category: string;
  comment: string;
}

export const FeedbackWidget: React.FC<{ userAddress: string | null }> = ({ userAddress }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState('usability');
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const feedback: FeedbackEntry = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      user: userAddress || 'Anonymous Guest',
      rating,
      category,
      comment: comment.trim(),
    };

    try {
      const existing = localStorage.getItem('meditrust_user_feedback');
      const list = existing ? JSON.parse(existing) : [];
      list.push(feedback);
      localStorage.setItem('meditrust_user_feedback', JSON.stringify(list));
      
      trackEvent('user_feedback_submitted', { rating, category });
      setIsSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitted(false);
        setComment('');
        setRating(5);
      }, 2000);
    } catch (err) {
      console.error('Failed to submit feedback', err);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button className={styles.fab} onClick={() => setIsOpen(true)}>
        💬 Leave Feedback
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <h3 className={styles.title}>MediTrust User Feedback</h3>
              <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                &times;
              </button>
            </div>

            {isSubmitted ? (
              <div className={styles.successState}>
                <div className={styles.successIcon}>🎉</div>
                <h4 className={styles.successTitle}>Thank You!</h4>
                <p className={styles.successText}>Your feedback has been logged to the auditing database.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <p className={styles.desc}>
                  We are testing MediTrust Alpha. Leave your feedback to help us build Level 5!
                </p>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Rate your experience:</label>
                  <div className={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`${styles.star} ${star <= rating ? styles.activeStar : ''}`}
                        onClick={() => setRating(star)}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="category">Feedback Category:</label>
                  <select
                    id="category"
                    className={styles.select}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="usability">Usability / Design</option>
                    <option value="wallet">Wallet Connecting / Signature</option>
                    <option value="contract">Escrow Operations / Funding</option>
                    <option value="bug">Report a Bug</option>
                    <option value="other">Other / Suggestion</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="comment">Comments / Suggestions:</label>
                  <textarea
                    id="comment"
                    className={styles.textarea}
                    placeholder="Tell us what you liked or what went wrong..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                <button type="submit" className={styles.submitBtn}>
                  Submit Feedback
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
export type { FeedbackEntry };
