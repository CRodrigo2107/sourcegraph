package gitlaboauth

import (
	"net/url"

	"github.com/sourcegraph/sourcegraph/cmd/frontend/auth/providers"
	"github.com/sourcegraph/sourcegraph/internal/conf"
	"github.com/sourcegraph/sourcegraph/internal/conf/conftypes"
	"github.com/sourcegraph/sourcegraph/internal/database/dbutil"
	"github.com/sourcegraph/sourcegraph/schema"
)

const PkgName = "gitlaboauth"

func Init(db dbutil.DB) {
	conf.ContributeValidator(func(cfg conftypes.SiteConfigQuerier) conf.Problems {
		_, problems := parseConfig(cfg, db)
		return problems
	})
	go func() {
		conf.Watch(func() {
			newProviders, _ := parseConfig(conf.Get(), db)
			if len(newProviders) == 0 {
				providers.Update(PkgName, nil)
			} else {
				newProvidersList := make([]providers.Provider, 0, len(newProviders))
				for _, p := range newProviders {
					newProvidersList = append(newProvidersList, p)
				}
				providers.Update(PkgName, newProvidersList)
			}
		})
	}()
}

func parseConfig(cfg conftypes.SiteConfigQuerier, db dbutil.DB) (ps map[schema.GitLabAuthProvider]providers.Provider, problems conf.Problems) {
	ps = make(map[schema.GitLabAuthProvider]providers.Provider)
	for _, pr := range cfg.SiteConfig().AuthProviders {
		if pr.Gitlab == nil {
			continue
		}

		if cfg.SiteConfig().ExternalURL == "" {
			problems = append(problems, conf.NewSiteProblem("`externalURL` was empty and it is needed to determine the OAuth callback URL."))
			continue
		}
		externalURL, err := url.Parse(cfg.SiteConfig().ExternalURL)
		if err != nil {
			problems = append(problems, conf.NewSiteProblem("Could not parse `externalURL`, which is needed to determine the OAuth callback URL."))
			continue
		}
		callbackURL := *externalURL
		callbackURL.Path = "/.auth/gitlab/callback"

		provider, providerMessages := parseProvider(db, callbackURL.String(), pr.Gitlab, pr)
		problems = append(problems, conf.NewSiteProblems(providerMessages...)...)
		if provider != nil {
			ps[*pr.Gitlab] = provider
		}
	}
	return ps, problems
}
