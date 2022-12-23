import { timeStamp } from 'console'
import { create } from 'domain'
import {
    AdditiveBlending,
    BufferAttribute,
    BufferGeometry,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    PointLight,
    Raycaster,
    TextureLoader,
    Vector3,
} from 'three'
import { scene, sceneObjects } from './client'
import { world } from './utils'

const lineSegments = 25
const lineGeometry = new BufferGeometry()
const lineGeometryVertices = new Float32Array((lineSegments + 1) * 3)
lineGeometryVertices.fill(0)
lineGeometry.setAttribute('position', new BufferAttribute(lineGeometryVertices, 3))
let lineMaterial = new LineBasicMaterial({
    color: 0x555555,
    blending: AdditiveBlending,
})

const guideLine = new Line(lineGeometry, lineMaterial)
const guideFootTexture = new TextureLoader().load('./textures/target.png')
const guideFootSprite = new Mesh(
    new PlaneGeometry(0.3, 0.3, 1, 1),
    new MeshBasicMaterial({
        map: guideFootTexture,
        blending: AdditiveBlending,
        color: 0x888888,
        transparent: true,
    })
)

guideFootSprite.rotation.x = (-1 * Math.PI) / 2

const footPointLight = new PointLight(0x00ff00, 1.0, 5)
function getPosition(positionVec, t, p0, velocity, gravity) {
    positionVec.copy(p0)
    positionVec.addScaledVector(velocity, t) //remember it should be vector, float [order matters]
    positionVec.addScaledVector(new Vector3(0, gravity, 0), 0.5 * Math.pow(t, 2))
    return positionVec
}

function findTotalTime(p0y, velocity, gravity) {
    let solution =
        (-1 * velocity.y + Math.sqrt(Math.pow(velocity.y, 2) - 2 * gravity * p0y)) / gravity
    return solution
}

function createRay(controller, scene) {
    //  this is in ray-target space so first point is origin itself
    let raycaster = new Raycaster()
    let startVertex = new Vector3(0, 0, 0)
    let startingPositionWorld = new Vector3()
    let rayDirectionWorld = new Vector3()
    controller.getWorldPosition(startingPositionWorld)
    controller.getWorldDirection(rayDirectionWorld)
    rayDirectionWorld = rayDirectionWorld.multiplyScalar(6)

    let totalTime = findTotalTime(startingPositionWorld.y, rayDirectionWorld, -9.8)
    let localPosition = new Vector3()
    scene.add(guideFootSprite)
    scene.add(footPointLight)
    let prevPosition = startingPositionWorld
    for (let i = 1; i <= lineSegments; i++) {
        let timeStamp = (i * totalTime) / lineSegments
        localPosition = getPosition(
            localPosition,
            timeStamp,
            startingPositionWorld,
            rayDirectionWorld,
            -9.8
        )
        let direction = new Vector3(
            localPosition.x - prevPosition.x,
            localPosition.y - prevPosition.y,
            localPosition.z - prevPosition.z
        )
        raycaster.ray.origin.set(prevPosition.x, prevPosition.y, prevPosition.z)
        raycaster.ray.direction.set(direction.x, direction.y, direction.z)
        const intersections = raycaster.intersectObjects(sceneObjects, false)
        let intersection = intersections.length > 0 ? intersections[0] : null
        if (intersection !== null) {
            console.log('selected something')
            if (intersection.object.userData.index >= 0) {
                console.log('physics body hit')
            }
        }
        prevPosition = new Vector3(localPosition.x, localPosition.y, localPosition.z)

        // remember that this localposition is in world cordinate system so need to convert to world
        controller.worldToLocal(localPosition)
        localPosition.toArray(lineGeometryVertices, i * 3)
    }
    guideLine.geometry.attributes.position.needsUpdate = true
    controller.add(guideLine)
    getPosition(
        guideFootSprite.position,
        totalTime * 0.82,
        startingPositionWorld,
        rayDirectionWorld,
        -9.8
    )
    getPosition(
        footPointLight.position,
        totalTime * 0.82,
        startingPositionWorld,
        rayDirectionWorld,
        -9.8
    )
}

function removeRay(controller, scene) {
    controller.userData.selectPressed = false
    // if(intersection){

    // }
    controller.remove(guideLine)
    scene.remove(guideFootSprite)
    scene.remove(footPointLight)
}

export { createRay, removeRay }