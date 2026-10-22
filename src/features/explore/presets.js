export const CONFIG_PARAMS = [
  {
    'type': 'anime',
    'data': {
      'title': 'Explore Anime',
      'type': 'tv',
      'lang': 'ja',
      'genre': 16,
      'reg': 'JP',
      'voteCount': 10
    },
    'filters': { 'genre': 'hidden' }
  },
  {
    'type': 'anime-movies',
    'data': {
      'title': 'Explore Anime Movies',
      'type': 'movie',
      'lang': 'ja',
      'genre': 16,
      'reg': 'JP',
      'voteCount': 10
    },
    'filters': { 'genre': 'hidden', 'year': 'hidden' }
  },
  {
    'type': 'top-rated-movies',
    'data': {
      'title': 'Top Rated Movies',
      'type': 'movie',
      'sortBy': 'vote_average',
      'voteCount': 10000,
      'minRating': 7,
    },
    'filters': { 'sort': 'hidden' }
  },
  {
    'type': 'top-rated-tv-shows',
    'data': {
      'title': 'Top Rated TV Shows',
      'type': 'tv',
      'sortBy': 'vote_average',
      'voteCount': 3000,
      'minRating': 7
    },
    'filters': { 'sort': 'hidden' }
  },
  {
    'type': 'indian-movies',
    'data': {
      'title': 'Indian Movies',
      'type': 'movie',
      'reg': 'IN',
      'voteCount': 1,
      'minRating': 3
    }
  },
  {
    'type': 'indian-tv-shows',
    'data': {
      'title': 'Indian TV Shows',
      'type': 'tv',
      'reg': 'IN',
      'voteCount': 3,
      'minRating': 3
    }
  },
  {
    'type': 'studio',
    'data': [
      {
        'type': 'studio-ghibli',
        'data': {
          'title': 'Studio Ghibli',
          'type': 'movie',
          'company': 10342,
          'voteCount': 10,
          'minRating': 3
        },
        'filters': {
          'genre': 'hidden',
          'minRate': 'hidden',
          'year': 'hidden'
        }
      },
      {
        'type': 'marvel-studios',
        'data': {
          'title': 'Marvel Studios',
          'type': 'movie',
          'company': 420,
          'voteCount': 10,
          'minRating': 3
        },
        'filters': {
          'genre': 'hidden',
          'minRate': 'hidden',
          'year': 'hidden'
        }
      },
      {
        'type': 'production-ig',
        'data': {
          'title': 'Production I.G.',
          'type': 'tv',
          'company': 529,
          'voteCount': 3,
          'minRating': 3
        },
        'filters': {
          'genre': 'hidden',
          'minRate': 'hidden',
          'year': 'hidden'
        }
      },
      {
        'type': 'paramount-pictures',
        'data': {
          'title': 'Paramount Pictures',
          'type': 'movie',
          'company': 4,
          'voteCount': 3,
          'minRating': 3
        },
        'filters': {
          'genre': 'hidden',
          'minRate': 'hidden',
          'year': 'hidden'
        }
      }
    ]
  }
];
