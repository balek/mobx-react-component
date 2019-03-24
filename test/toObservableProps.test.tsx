import * as mobx from "mobx"
import { observer, useComputed } from "mobx-react"
import * as React from "react"
import { useState } from "react"
import { cleanup, render } from "react-testing-library"
import { toObservableProps, ToObservablePropsMode } from "../src"

function toJson(val: any): string {
    if (val instanceof Map) {
        return JSON.stringify([...val])
    }
    return JSON.stringify(val)
}

function doTest(options: ToObservablePropsMode<any>) {
    describe(`options: ${JSON.stringify(options)}`, () => {
        const shallow = options === "shallow"

        let computedCalls: string[] = []
        let renders!: number

        let rerender: (ui: React.ReactElement<any>) => void
        beforeAll(() => {
            cleanup()
            const ret = render(<div />)
            rerender = ret.rerender
        })

        beforeEach(() => {
            computedCalls = []
            renders = 0
        })

        function ComponentClass(nonObsProps: any) {
            const [obsProps] = useState(() => toObservableProps<any>(options))
            obsProps.update(nonObsProps)
            const props = obsProps.get()

            const computedWithProp1 = useComputed(() => {
                const prop1Value = props.prop1
                computedCalls.push("prop1: " + toJson(prop1Value))
                return prop1Value
            })

            const computedWithProp2 = useComputed(() => {
                const prop2Value = props.prop2
                computedCalls.push("prop2: " + toJson(prop2Value))
                return prop2Value
            })

            const deepComputed = useComputed(() => {
                const prop3Value = props.prop3 && props.prop3.x
                computedCalls.push("prop3.x: " + toJson(prop3Value))
                return prop3Value
            })

            const computedComponent = useComputed(() => {
                const value = props.componentProp
                computedCalls.push("componentProp: " + toJson(!!value))
                return value
            })

            // render
            const p1 = computedWithProp1
            toJson(p1) // just to deeply read it
            const p2 = computedWithProp2
            const deepC = deepComputed
            const str = `${p1} ${p2} ${deepC}`

            renders++
            return computedComponent || props.children || str
        }

        const Component = observer(ComponentClass)

        it("initial state", async () => {
            rerender(<Component prop1={1} />)
            expect(computedCalls).toEqual([
                "prop1: 1",
                "prop2: undefined",
                "prop3.x: undefined",
                "componentProp: false"
            ])
            expect(renders).toBe(1)
        })

        it("prop1 changed from 1 to 2, prop2 is untouched", async () => {
            rerender(<Component prop1={2} />)
            expect(computedCalls).toEqual(["prop1: 2"])
            expect(renders).toBe(2) // should be 1
        })

        it("props untouched, unobserved property added", async () => {
            rerender(<Component prop1={2} unused={10} />)
            expect(computedCalls).toEqual([])
            expect(renders).toBe(1) // TODO: wish this could be optimized to avoid the unecessary re-render
        })

        it("props untouched, unobserved property removed", async () => {
            rerender(<Component prop1={2} />)
            expect(computedCalls).toEqual([])
            expect(renders).toBe(1) // TODO: wish this could be optimized to avoid the unecessary re-render
        })

        it("prop1 is untouched, prop2 appears", async () => {
            rerender(<Component prop1={2} prop2={1} />)
            expect(computedCalls).toEqual(["prop2: 1"])
            expect(renders).toBe(2) // should be 1
        })

        it("prop1 is untouched, prop2 changes from 1 to 2", async () => {
            rerender(<Component prop1={2} prop2={2} />)
            expect(computedCalls).toEqual(["prop2: 2"])
            expect(renders).toBe(2) // should be 1
        })

        it("prop2 is untouched, prop1 changes from 2 to 1", async () => {
            rerender(<Component prop1={1} prop2={2} />)
            expect(computedCalls).toEqual(["prop1: 1"])
            expect(renders).toBe(2) // should be 1
        })

        it("nothing changed - no recalc", async () => {
            rerender(<Component prop1={1} prop2={2} />)
            expect(computedCalls).toEqual([])
            expect(renders).toBe(0) // no re-render needed
        })

        it("prop1 disappear, prop2 is untouched", async () => {
            rerender(<Component prop2={2} />)
            expect(computedCalls).toEqual(["prop1: undefined"])
            expect(renders).toBe(2) // should be 1
        })

        it("if we replace prop2 to prop1, both computeds should be recalculated", async () => {
            rerender(<Component prop1={2} />)
            expect(computedCalls).toEqual(["prop1: 2", "prop2: undefined"])
            expect(renders).toBe(2) // should be 1
        })

        it("remove prop1 should only recalc prop1", async () => {
            rerender(<Component />)
            expect(computedCalls).toEqual(["prop1: undefined"])
            expect(renders).toBe(2) // should be 1
        })

        it("correctly catch prop1 appearing after disappearing", async () => {
            rerender(<Component prop1={2} />)
            expect(computedCalls).toEqual(["prop1: 2"])
            expect(renders).toBe(2) // should be 1
        })

        it("swap again - all recalculated", async () => {
            rerender(<Component prop2={2} />)
            expect(computedCalls).toEqual(["prop1: undefined", "prop2: 2"])
            expect(renders).toBe(2) // should be 1
        })

        it("remove all", async () => {
            rerender(<Component />)
            expect(computedCalls).toEqual(["prop2: undefined"])
            expect(renders).toBe(2) // should be 1
        })

        // already observable objects
        const dp = mobx.observable({})

        it("(obs object) deep prop with empty object", async () => {
            rerender(<Component prop3={dp} />)
            expect(computedCalls).toEqual(["prop3.x: undefined"])
            expect(renders).toBe(1) // TODO: wish this could be optimized to avoid the unecessary re-render
        })

        it("(obs object) deep prop with value set", async () => {
            mobx.set(dp, "x", 5)
            rerender(<Component prop3={dp} />)
            expect(computedCalls).toEqual(["prop3.x: 5"])
            expect(renders).toBe(1)
        })

        it("(obs object) deep prop with value removed", async () => {
            mobx.remove(dp, "x")
            rerender(<Component prop3={dp} />)
            expect(computedCalls).toEqual(["prop3.x: undefined"])
            expect(renders).toBe(1)
        })

        // non observable objects
        it("(new obj) deep prop with empty object", async () => {
            rerender(<Component prop3={{}} />)
            expect(computedCalls).toEqual(["prop3.x: undefined"])
            expect(renders).toBe(1) // TODO: wish this could be optimized to avoid the unecessary re-render
        })

        it("(new obj) deep prop with value set", async () => {
            rerender(<Component prop3={{ x: 5, y: { z: [6] }, m: new Map([[1, 2]]) }} />)
            expect(computedCalls).toEqual(["prop3.x: 5"])
            expect(renders).toBe(2) // should be 1
        })

        it("(new obj) deep prop with value set to the same one as before", async () => {
            rerender(<Component prop3={{ x: 5, y: { z: [6] }, m: new Map([[1, 2]]) }} />)
            expect(computedCalls).toEqual(shallow ? ["prop3.x: 5"] : [])
            expect(renders).toBe(1) // TODO: wish this could be optimized to avoid the unecessary re-render
        })

        it("(new obj) deep prop with value removed", async () => {
            rerender(<Component prop3={{}} />)
            expect(computedCalls).toEqual(["prop3.x: undefined"])
            expect(renders).toBe(2) // should be 1
        })

        // component and children
        it("passing a component works", async () => {
            let innerRenders = 0
            function InnerC() {
                innerRenders++
                return null
            }
            rerender(<Component componentProp={<InnerC />} />)
            expect(innerRenders).toBe(1)
            expect(computedCalls).toEqual(["prop3.x: undefined", "componentProp: true"])
            expect(renders).toBe(2) // should be 1
        })

        it("passing a children component works", async () => {
            let innerRenders = 0
            function InnerC() {
                innerRenders++
                return null
            }
            rerender(
                <Component>
                    <InnerC />
                </Component>
            )
            expect(innerRenders).toBe(1)
            expect(computedCalls).toEqual(["componentProp: false"])
            expect(renders).toBe(2) // should be 1
        })

        // array
        it("array", async () => {
            rerender(<Component prop1={[1, 2]} />)
            expect(computedCalls).toEqual(["prop1: [1,2]"])
            expect(renders).toBe(2) // should be 1
        })

        it("array (same)", async () => {
            rerender(<Component prop1={[1, 2]} />)
            expect(computedCalls).toEqual(shallow ? ["prop1: [1,2]"] : [])
            expect(renders).toBe(shallow ? 2 : 1) // TODO: shallow ? 1 : 0 -  wish this could be optimized to avoid the unecessary re-render
        })

        it("array (mutate)", async () => {
            rerender(<Component prop1={[1, 3]} />)
            expect(computedCalls).toEqual(["prop1: [1,3]"])
            expect(renders).toBe(2) // should be 1
        })

        it("array (add item)", async () => {
            rerender(<Component prop1={[1, 2, 3]} />)
            expect(computedCalls).toEqual(["prop1: [1,2,3]"])
            expect(renders).toBe(2) // should be 1
        })

        it("array (remove item)", async () => {
            rerender(<Component prop1={[1, 2]} />)
            expect(computedCalls).toEqual(["prop1: [1,2]"])
            expect(renders).toBe(2) // should be 1
        })

        // map
        it("map", async () => {
            rerender(<Component prop1={new Map([[1, 1], [2, 2]])} />)
            expect(computedCalls).toEqual(
                shallow ? ["prop1: [[1,1],[2,2]]"] : ['prop1: {"1":1,"2":2}']
            )
            expect(renders).toBe(2) // should be 1
        })

        it("map (same)", async () => {
            rerender(<Component prop1={new Map([[1, 1], [2, 2]])} />)
            expect(computedCalls).toEqual(shallow ? ["prop1: [[1,1],[2,2]]"] : [])
            expect(renders).toBe(shallow ? 2 : 1) // TODO: shallow ? 1 : 0 -  wish this could be optimized to avoid the unecessary re-render
        })

        it("map (mutate)", async () => {
            rerender(<Component prop1={new Map([[1, 1], [3, 3]])} />)
            expect(computedCalls).toEqual(
                shallow ? ["prop1: [[1,1],[3,3]]"] : ['prop1: {"1":1,"3":3}']
            )
            expect(renders).toBe(2) // should be 1
        })

        it("map (add item)", async () => {
            rerender(<Component prop1={new Map([[1, 1], [2, 2], [3, 3]])} />)
            expect(computedCalls).toEqual(
                shallow ? ["prop1: [[1,1],[2,2],[3,3]]"] : ['prop1: {"1":1,"2":2,"3":3}']
            )
            expect(renders).toBe(2) // should be 1
        })

        it("map (remove item)", async () => {
            rerender(<Component prop1={new Map([[1, 1], [2, 2]])} />)
            expect(computedCalls).toEqual(
                shallow ? ["prop1: [[1,1],[2,2]]"] : ['prop1: {"1":1,"2":2}']
            )
            expect(renders).toBe(2) // should be 1
        })
    })
}

doTest("shallow")
doTest("deep")
