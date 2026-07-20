import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary voor TuinPlanner.
 * Vangt onverwachte JavaScript-fouten op in de component tree
 * en toont een gebruiksvriendelijke foutpagina in plaats van een wit scherm.
 *
 * Gebruikt inline styles (geen Tailwind) zodat de foutpagina ook werkt
 * als CSS niet geladen is.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TuinPlanner Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#f0fdf4',
          color: '#1a1a1a',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#166534' }}>
              Oeps, er ging iets mis
            </h1>
            <p style={{ color: '#555', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Er is een onverwachte fout opgetreden in TuinPlanner.
              Probeer de pagina te herladen.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#166534',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              Pagina herladen
            </button>
            {this.state.error && (
              <details style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#888', fontSize: '0.85rem' }}>
                  Technische details
                </summary>
                <pre style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
