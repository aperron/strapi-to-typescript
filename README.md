# Strapi-to-TypeScript

Convert the Strapi models to TypeScript interfaces by processing each of the `./api/**/models/*.settings.json` recursively.

# Install and Run

```sh
yarn config set @aperron:registry https://npm.pkg.github.com
```

```sh
yarn add -g @aperron/strapi-to-typescript
#yarn --update-checksums
cd path/to/strapi/
sts ./api/ -g ./components/ -o path/to/your/types/dir/
```

You may define multiple inputs. In case your API models have relations to other plugins like 'users-permissions'.

```sh
sts ./api ./extensions/users-permissions/models/ -g ./components/ -o path/to/your/types/dir/
```

You may generate enumeration or union types with option -e

```sh
sts ./api ./extensions/users-permissions/models/ -e -g ./components/ -o path/to/your/types/dir/
```

```js
// enumeration (with -e option) 
export interface IOrder {
  payment: IOrderPayment;
}

export enum IOrderPayment {
  card = "card",
  check = "check",
}
// OR union types (by default)
export interface IOrder {
  payment: "card" | "check";
}
```

# Build

```sh
npm i
npm run build
```

## Explanation

The input folder is recursively processed and each model file is read. When done, the expected output folder is generated, and finally, the Strapi models are converted to TypeScript.
