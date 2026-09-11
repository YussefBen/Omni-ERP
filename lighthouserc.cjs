// Config Lighthouse CI
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      // Le score varie d'un passage à l'autre selon la charge de la machine
      // de test : trois passages, dont on retient le passage médian.
      numberOfRuns: 3,
    },
    assert: {
      // Juge le passage médian, et non le meilleur des trois : un passage
      // chanceux ne doit pas masquer un score réellement insuffisant.
      aggregationMethod: 'median-run',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};