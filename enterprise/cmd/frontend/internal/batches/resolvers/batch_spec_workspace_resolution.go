package resolvers

import (
	"context"
	"strconv"

	"github.com/sourcegraph/sourcegraph/cmd/frontend/graphqlbackend"
	"github.com/sourcegraph/sourcegraph/enterprise/internal/batches/store"
	btypes "github.com/sourcegraph/sourcegraph/enterprise/internal/batches/types"
)

type batchSpecWorkspaceResolutionResolver struct {
	store      *store.Store
	resolution *btypes.BatchSpecResolutionJob
}

var _ graphqlbackend.BatchSpecWorkspaceResolutionResolver = &batchSpecWorkspaceResolutionResolver{}

func (r *batchSpecWorkspaceResolutionResolver) State() string {
	return r.resolution.State.ToGraphQL()
}

func (r *batchSpecWorkspaceResolutionResolver) StartedAt() *graphqlbackend.DateTime {
	if r.resolution.StartedAt.IsZero() {
		return nil
	}
	return &graphqlbackend.DateTime{Time: r.resolution.StartedAt}
}

func (r *batchSpecWorkspaceResolutionResolver) FinishedAt() *graphqlbackend.DateTime {
	if r.resolution.FinishedAt.IsZero() {
		return nil
	}
	return &graphqlbackend.DateTime{Time: r.resolution.FinishedAt}
}

func (r *batchSpecWorkspaceResolutionResolver) FailureMessage() *string {
	return r.resolution.FailureMessage
}

func (r *batchSpecWorkspaceResolutionResolver) Workspaces(ctx context.Context, args *graphqlbackend.ListWorkspacesArgs) (graphqlbackend.BatchSpecWorkspaceConnectionResolver, error) {
	opts := store.ListBatchSpecWorkspacesOpts{
		BatchSpecID: r.resolution.BatchSpecID,
	}
	if err := validateFirstParamDefaults(args.First); err != nil {
		return nil, err
	}
	opts.Limit = int(args.First)
	if args.After != nil {
		id, err := strconv.Atoi(*args.After)
		if err != nil {
			return nil, err
		}
		opts.Cursor = int64(id)
	}

	return &batchSpecWorkspaceConnectionResolver{store: r.store, opts: opts}, nil
}

func (r *batchSpecWorkspaceResolutionResolver) Unsupported(ctx context.Context) graphqlbackend.RepositoryConnectionResolver {
	// TODO(ssbc): not implemented
	return nil
}

func (r *batchSpecWorkspaceResolutionResolver) RecentlyCompleted(ctx context.Context, args *graphqlbackend.ListRecentlyCompletedWorkspacesArgs) graphqlbackend.BatchSpecWorkspaceConnectionResolver {
	// TODO(ssbc): not implemented
	return nil
}

func (r *batchSpecWorkspaceResolutionResolver) RecentlyErrored(ctx context.Context, args *graphqlbackend.ListRecentlyErroredWorkspacesArgs) graphqlbackend.BatchSpecWorkspaceConnectionResolver {
	// TODO(ssbc): not implemented
	return nil
}
