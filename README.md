# yeapAi/newboy-action
Run Postman collections via Newman.

# Newman Action

Allows you to run Postman's headless collection runner: Newman.

## Getting Started

This action allows two ways of retrieving your Postman collections/environments : 
- collections: by Id or by name and fork label.
- environments: by Id or by name

## Inputs 
```
apiKey
```
-string: your Postman token value
```
collection
```
- string: the collection name
- id : the collection Id
```
fork_label 
```
- string: the label of the fork of the collection (described by the name above). If blank, the main collection is considered.
```
fork_label_failback
```
- string: the label of the fork if no collection forks correspond to the fork_label. If blank, the main collection is considered.
```
fork_labels_ignored
```
- string: the labels (separated by a coma) that must be ignored and replaced by a blank string.
```
fork_label_remove_refs_heads
```
- string: if set to '1' (by default), the leading string 'refs/heads/' of the fork label is replaced by a blank string : useful when the fork label is set with the action context value ${{ github.ref }}.
```
environment
```
  - string: the environment name
  - id : the environment Id
## Example workflow file matching a branch of repository to a Postman collection 

This yml file should be located in `.github/workflows`.
In this example, the name of the collection corresponds to the name of the repository and the fork label corresponds to the branch name that must be merged. If no collection fork correspond to the fork_label input, the main collection will be considered.

```
name: Newman Run

on: [pull_request]
jobs:
  newboy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master
      - uses: yeapAi/newboy-action@master
        with:
          apiKey: ${{ secrets.postman_api_key }}
          collection: ${{ github.repos }}
          fork_label: ${{ github.ref }}
          environment: postman-http
```
